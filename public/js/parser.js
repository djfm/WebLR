function Item(rule, pos)
{
	var dotPos = pos || 0;

	this.getDotPos = function()
	{
		return dotPos;
	}

	this.getLhs = function(){
		return rule.lhs;
	};

	this.hash = function()
	{
		return rule.id+':'+dotPos;
	};

	this.atSymbol = function(symbolName)
	{
		if(dotPos === -1)
		{
			return false;
		}
		else
		{
			if ((symbolName && rule.rhs[dotPos].name === symbolName) || !symbolName)
			{
				return {
					name: rule.rhs[dotPos].name,
					nonTerminal: Item.isNonTerminalSymbol(rule.rhs[dotPos])
				};
			}
			else
			{
				return false;
			}
		}
	};

	this.atNonTerminal = function()
	{
		var maybeSymbol = this.atSymbol();
		return (maybeSymbol && maybeSymbol.nonTerminal) ? maybeSymbol.name : false;
	};

	this.advance = function()
	{
		if (dotPos === -1)
		{
			return new Item(rule, -1);
		}
		else if (dotPos < rule.rhs.length - 1)
		{
			return new Item(rule, dotPos + 1);
		}
		else
		{
			return new Item(rule, -1);
		}
	};

	this.getRule = function()
	{
		return rule;
	};
};

Item.isNonTerminalSymbol = function(rhsElement)
{
	return rhsElement.name.match(/^[A-Z]/);
};

function ItemSet()
{
	var id;
	var items = {};
	var empty = true;

	this.isEmpty = function()
	{
		return empty;
	};

	this.getItems = function()
	{
		return items;
	};

	this.hash = function()
	{
		return Object.keys(items).sort().join(',');
	};

	this.add = function(item)
	{
		empty = false;
		var hash = item.hash();
		if (items[hash])
		{
			return false;
		}
		else
		{
			items[hash] = item;
			return true;
		}
	};

	this.close = function(params)
	{
		var subSet = new ItemSet();

		var toProcess = params.items || items;

		for(var i in toProcess)
		{
			var item = toProcess[i];
			var symbolName;

			if(symbolName = item.atNonTerminal())
			{
				for(var r in params.rules)
				{
					var rule = params.rules[r];
					if (rule.lhs.name === symbolName)
					{
						var newItem = new Item(rule);
						if (this.add(newItem))
						{
							subSet.add(newItem);
						}
					}
				}
			}
		}

		if (!subSet.isEmpty())
		{
			this.close({
				rules: params.rules,
				items: subSet.getItems()
			});
		}
	};

	this.getCurrentSymbols = function()
	{
		var symbols = {};
		for(var i in items)
		{
			var item = items[i];
			var symbol;

			if(symbol=item.atSymbol())
			{
				symbols[symbol.name] = symbol.nonTerminal ? 'nonTerminal' : 'terminal';
			}
		}
		return symbols;
	};

	this.getItemsAt = function(symbolName)
	{
		var at = [];
		for(var i in items)
		{
			var item = items[i];
			if(item.atSymbol(symbolName))
			{
				at.push(item);
			}
		}
		return at;
	};

	this.setId = function(i)
	{
		id = i;
	};

	this.getId = function()
	{
		return id;
	};
};

function ItemSets()
{
	var maxId = -1;
	var itemSets = {};
	var itemSetsById = {};
	var empty = true;

	this.isEmpty = function()
	{
		return empty;
	};

	this.add = function(itemSet)
	{
		empty = false;
		var hash = itemSet.hash();
		if(itemSets[hash])
		{
			return {
				added: false,
				// Return already found set, not the new one!
				itemSet: itemSets[hash]
			};
		}
		else
		{
			maxId++;
			itemSet.setId(maxId);
			itemSets[hash] = itemSet;
			itemSetsById[maxId] = itemSet;
			return {
				added: true,
				itemSet: itemSet
			};
		}
	};

	this.getItemSets = function()
	{
		return itemSets;
	};

	this.count = function()
	{
		return maxId + 1;
	}
}

function ParserGenerator(rules)
{
	var itemSets = new ItemSets();
	var shifts = {};
	var gotos = {};
	var reduces = {};
	var accept = {};

	var terminals = {};
	var nonTerminals = {};

	var grammarOk = false;
	var initialState = null;

	for(var r in rules)
	{
		// Index rules
		rules[r].id = r;
		// Extract symbols for later
		for(var i in rules[r].rhs)
		{
			var name = rules[r].rhs[i].name;
			if (Item.isNonTerminalSymbol(rules[r].rhs[i]))
			{
				nonTerminals[name] = true;
			}
			else
			{
				terminals[name] = true;
			}
		}
	}

	this.computeParseTable = function()
	{
		var startItem = null;
		for(var r in rules)
		{
			if (rules[r].lhs.name === 'Start')
			{
				startItem = new Item(rules[r]);
				break;
			}
		}

		if (!startItem)
		{
			return 'Could not find start rule. There must be exactly one rule with "Start" as left hand side.';
		}

		var startItemSet = new ItemSet();
		startItemSet.add(startItem);

		this.closeItemSetAndFindNextOnes(startItemSet);

		initialState = startItemSet.getId();

		this.recordReduces();
		var table = this.buildExtensiveTable();

		var conflicts = this.listConflicts();
		grammarOk = (conflicts.length === 0);
		
		return table;
	};

	this.isGrammarOk = function()
	{
		return grammarOk;
	};

	this.buildExtensiveTable = function()
	{
		var rows = {};
		var headers = Object.keys(terminals).concat(Object.keys(nonTerminals));
		headers.push('$');

		for(var i=0; i<itemSets.count(); i++)
		{
			rows[i] = {};
			for(var t in terminals)
			{
				rows[i][t] = {
					shift: (shifts[i] && shifts[i][t]) || null,
					reduces: reduces[i] || [],
					to: null,
					accept: false
				};

				if(rows[i][t].shift && rows[i][t].reduces.length > 0)
				{
					rows[i][t].conflicted = true;
				}
			}

			for(var nt in nonTerminals)
			{
				rows[i][nt] = {
					shift: null,
					reduces: [],
					to: (gotos[i] && gotos[i][nt]) || null,
					accept: false
				};
			}

			rows[i]['$'] = {
				shifts: null,
				reduces: [],
				to: null,
				accept: accept[i] || null
			};
		}
		return {
			headers: headers,
			rows: rows
		};
	};

	this.listConflicts = function()
	{
		var conflicts = [];
		for(var s in shifts)
		{
			if(s in reduces)
			{
				conflicts.push({
					type: 'shift/reduce',
					state: s
				});
			}
		}
		for(var s in reduces)
		{
			if(reduces[s].length > 1)
			{
				conflicts.push({
					type: 'reduce/reduce',
					state: s
				});
			}
		}

		return conflicts;
	};

	this.recordReduces = function()
	{
		var sets = itemSets.getItemSets();
		for(var i in sets)
		{
			var itemSet = sets[i];
			var items = itemSet.getItems();
			var state = itemSet.getId();

			for(var j in items)
			{
				var item = items[j];
				if(item.getDotPos() === -1)
				{
					if(item.getLhs().name !== 'Start')
					{
						if(!reduces[state])
						{
							reduces[state] = [];
						}
						reduces[state].push(item.getRule().id);
					}
					else
					{
						accept[state] = true;
					}
				}
			}
		}
	}

	this.closeItemSetAndFindNextOnes = function(itemSet, comingFrom)
	{
		itemSet.close({
			rules: rules
		});

		var added = itemSets.add(itemSet);
		// Make sure we always get the same instance
		itemSet = added.itemSet;

		if(comingFrom)
		{
			var fromId = comingFrom.itemSet.getId();
			var toId = itemSet.getId();
			var symbolName = comingFrom.symbol.name;
			var symbolType = comingFrom.symbol.type;

			// Record shift action
			if(symbolType === 'terminal')
			{
				if(!shifts[fromId])
				{
					shifts[fromId] = {};
				}
				shifts[fromId][symbolName] = toId;
			}
			// Record goto
			else
			{
				if(!gotos[fromId])
				{
					gotos[fromId] = {};
				}
				gotos[fromId][symbolName] = toId;
			}
		}

		if(added.added)
		{
			var symbols = itemSet.getCurrentSymbols();
			for(var symbolName in symbols)
			{
				var nextSet = new ItemSet();
				var items = itemSet.getItemsAt(symbolName);
				for(var i in items)
				{
					var item = items[i];
					nextSet.add(item.advance());
				}
				this.closeItemSetAndFindNextOnes(nextSet, {
					itemSet: itemSet,
					symbol: {
						name: symbolName,
						type: symbols[symbolName]
					}
				});
			}
		}
	};

	this.parse = function(str)
	{
		console.log("Parsing string: ", str);

		var red = {};
		for(var s in reduces)
		{
			red[s] = parseInt(reduces[s][0]);
		}

		var parser = new Parser({
			rules: rules,
			initialState: initialState,
			shifts: shifts,
			reduces: red,
			gotos: gotos,
			accept: accept
		});

		return parser.parse(str);
	};
};

function Parser(description)
{
	console.log("Parser description:", description);

	var states = [description.initialState];
	var stack = [];

	this.getState = function()
	{
		if(states.length === 0)
		{
			return false;
		}
		return states[states.length-1];
	};

	this.push = function(state, token)
	{
		states.push(state);
		stack.push(token);
		//console.log("Token '"+(token.name || token)+"': pushed state "+state);
	};

	this.parse = function(str)
	{
		for(var i in str)
		{
			var ate = this.eat({
				type: 'terminal',
				name: str[i],
				value: str[i]
			});
			if(ate !== true)
			{
				return ate;
			}
		}

		if(description.accept[this.getState()])
		{
			return stack[0];
		}
		else
		{
			return "Parsing ended in a non-accepting state.";
		}
	};

	this.eat = function(token)
	{
		//console.log("Got token:", token);

		var nextState;

		if(description.shifts[this.getState()])
		{
			var state = description.shifts[this.getState()][token.name || token];
			if(typeof state === "number")
			{
				this.push(state, token);
			}
			else
			{
				return false;
			}

			return this.applyReductions();
		}

		return false;
	};

	this.reduce = function(reduce)
	{
		var lhs = description.rules[reduce].lhs.name;
		var size = description.rules[reduce].rhs.length;

		var node = {
			type: 'nonTerminal',
			name: lhs,
			children: []
		};

		for(var i=0; i<size; i++)
		{
			node.children.unshift({
				type: 'component',
				name: description.rules[reduce].rhs[i].name,
				children: [stack.pop()]
			});
			states.pop();
		}

		var goTo;
		if(description.gotos[this.getState()] && 
			(goTo=description.gotos[this.getState()][lhs]))
		{
			this.push(goTo, node);
			return this.applyReductions();
		}
		else
		{
			return "No GOTO action in state "+reduce+" for symbol '"+lhs+"'";
		}
	};

	this.applyReductions = function()
	{
		var reduce = description.reduces[this.getState()];
		if(typeof reduce === "number")
		{
			return this.reduce(parseInt(reduce));
		}
		else
		{
			return true;
		}
	};
};

/*
(0) S → E
(1) E → E * B
(2) E → E + B
(3) E → B
(4) B → 0
(5) B → 1
*/