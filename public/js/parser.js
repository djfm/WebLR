function ruleToString(rule)
{
	return rule.lhs.name + " = " +
	rule.rhs.map(function(item){return item.name;})
	.join(" ");
};

function resolutionToString(resolution)
{
	return "shift("+resolution.shift+") reduce("+resolution.reduce+") "+resolution.decision;
};

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

function ParserGenerator(rules, resolutions)
{
	var itemSets = new ItemSets();
	var shifts = {};
	var gotos = {};
	var reduces = {};
	var accept = {};
	var table;

	var terminals = {};
	var nonTerminals = {};

	var grammarOk = true;
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
		table = this.buildTable();

		return table;
	};

	this.isGrammarOk = function()
	{
		return grammarOk;
	};

	this.buildTable = function()
	{
		var conflicts = [];
		var rows = {};
		var headers = Object.keys(terminals).concat(Object.keys(nonTerminals));
		headers.push('$');

		for(var i=0; i<itemSets.count(); i++)
		{
			rows[i] = {};
			for(var t in terminals)
			{
				var shift = null;
				if(shifts[i] && (typeof shifts[i][t] === "number"))
				{
					shift = shifts[i][t];
				}
				var reds = reduces[i];

				if((typeof shift === "number") || reds)
				{
					rows[i][t] = {};
					if(typeof shift === "number")
					{
						rows[i][t].shift = parseInt(shift);
					}
					if(reds)
					{
						rows[i][t].reduces = reds.map(parseInt);
					}
				}
				
				if((typeof shift === "number") && reds)
				{
					rows[i][t].conflicted = true;

					if(reds.length > 1)
					{
						conflicts.push({
							type: "shift/reduces"
						});
					}
					else
					{

						var resolutionFound = false;
						for(var r in resolutions)
						{
							if(resolutions[r].shift == t && resolutions[r].reduce == reds[0])
							{
								resolutionFound = true;
								rows[i][t].conflicted = false;

								if(resolutions[r].decision === 'shift')
								{
									delete rows[i][t].reduces;
								}
								else
								{
									delete rows[i][t].shift;
								}

								break;
							}
						}

						if(!resolutionFound)
						{
							conflicts.push({
								type: "shift/reduce",
								state: i,
								symbol_or_rule: t,
								rule: ruleToString(rules[reds[0]]),
								options: [{
									name: 'Shift',
									shift: t,
									reduce: reds[0],
									decision: 'shift'
								},{
									name: 'Reduce',
									shift: t,
									reduce: reds[0],
									decision: 'reduce'
								}]
							});
						}
					}
				}
			}

			for(var nt in nonTerminals)
			{
				if(gotos[i] && (typeof gotos[i][nt] === "number"))
				{
					rows[i][nt] = {
						to: parseInt(gotos[i][nt])
					};
				}
			}

			if(accept[i])
			{
				rows[i]['$'] = {
					accept: true
				};
			}
		}

		grammarOk = conflicts.length === 0;

		return {
			headers: headers,
			rows: rows,
			conflicts: conflicts
		};
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
			table: table.rows
		});

		return parser.parse(str);
	};
};

function Parser(description)
{
	console.log("Parser description:", description);

	var states = [description.initialState];
	var stack = [];
	var symbol;

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
		console.log("Shifted to", state, "on", token.name || token);
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

		var reduced = this.applyReductions();
		if(reduced !== true)
		{
			return reduced;
		}

		var col = description.table[this.getState()];
		if(col && col['$'] && col['$'].accept)
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
		var nextState;

		symbol = token.name || token;
		
		var reduced = this.applyReductions();

		var col = description.table[this.getState()];

		if(reduced!==true)
		{
			return reduced;
		}

		if( col
			&& col[symbol]
			&& typeof(col[symbol].shift) === "number")
		{
			var state = col[symbol].shift;
			this.push(state, token);
			return true; //this.applyReductions();
		}

		return "No shift action in state "+this.getState()+" for token '"+symbol+"'!";
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
			var child = stack.pop();
			child.capturedBy = description.rules[reduce].rhs[i].name;
			node.children.unshift(child);
			states.pop();
		}

		console.log('Reduced to', this.getState(), "using rule", reduce);

		var cell = description.table[this.getState()];
		if( cell && cell[lhs] && cell[lhs].to && (typeof cell[lhs].to === "number"))
		{
			this.push(cell[lhs].to, node);
			return this.applyReductions();
		}
		else
		{
			return "No GOTO action in state "+reduce+" for symbol '"+lhs+"'";
		}
	};

	this.applyReductions = function()
	{
		var col = description.table[this.getState()];
		var cell = col[symbol];
		var reduce = cell && cell.reduces && cell.reduces[0];
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