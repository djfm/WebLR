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

function Item(rule, pos, lookAhead)
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
		return rule.id+':'+dotPos+'@'+lookAhead;
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
			return new Item(rule, -1, lookAhead);
		}
		else if (dotPos < rule.rhs.length - 1)
		{
			return new Item(rule, dotPos + 1, lookAhead);
		}
		else
		{
			return new Item(rule, -1, lookAhead);
		}
	};

	this.getRule = function()
	{
		return rule;
	};

	this.nextSymbol = function()
	{
		if(dotPos < rule.rhs.length - 1)
		{
			return rule.rhs[dotPos+1].name;
		}
		else
		{
			return false;
		}
	};

	this.getLookAhead = function()
	{
		return lookAhead;
	};

	this.toString = function ()
	{
		var string = rule.lhs.name + " =";
		for(var i in rule.rhs)
		{
			string += " ";
			if(i == dotPos)
			{
				string += "°";
			}
			string += rule.rhs[i].name;
		}
		if(dotPos == -1)
		{
			string += " °";
		}
		string += "  ["+lookAhead+"]";
		return string;
	}
};

Item.isNonTerminalSymbol = function(rhsElement)
{
	return (rhsElement.name || rhsElement).match(/^[A-Z]/);
};

Item.isTerminalSymbol = function(rhsElement)
{
	return !Item.isNonTerminalSymbol(rhsElement);
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
		function first(syms)
		{
			for(var s in syms)
			{
				var sym = syms[s];
				if(Item.isTerminalSymbol(sym))
				{
					var set = {};
					set[sym] = true;
					return set;
				}
				else if(Object.keys(params.first[sym]).length > 0)
				{
					return params.first[sym];
				}
			}

			throw "Could not compute first of: "+JSON.stringify(syms);
		};


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
						var syms = [];
						if(item.nextSymbol())
						{
							syms.push(item.nextSymbol());
						}
						syms.push(item.getLookAhead());
						console.log(item.toString());
						var lookAheads = first(syms);
						
						for(var la in lookAheads)
						{
							var newItem = new Item(rule, 0, la);
							if (this.add(newItem))
							{
								subSet.add(newItem);
							}
						}
					}
				}
			}
		}

		if (!subSet.isEmpty())
		{
			this.close({
				rules: params.rules,
				first: params.first,
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

function ParserGenerator(tokenizer, rules, resolutions)
{
	var itemSets = new ItemSets();
	var table = {};

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

	table.headers = Object.keys(terminals);
	table.headers.push('$');
	table.headers = table.headers.concat(Object.keys(nonTerminals));

	table.conflicts = [];
	table.rows = {};

	var first = {};

	this.computeFirstSets = function()
	{
		// Algorithm inspired from: http://www.stanford.edu/class/archive/cs/cs143/cs143.1128/lectures/03/Slides03.pdf
		for(var nt in nonTerminals)
		{
			first[nt] = {};
			for(var r in rules)
			{
				var rule = rules[r];
				if(rule.lhs.name === nt && Item.isTerminalSymbol(rule.rhs[0]))
				{
					first[nt][rule.rhs[0].name] = true;
				}
			}
		}

		var stable = false;
		while(!stable)
		{
			stable = true;

			for(var nt in nonTerminals)
			{
				for(var r in rules)
				{
					var rule = rules[r];
					if(rule.lhs.name === nt && Item.isNonTerminalSymbol(rule.rhs[0]))
					{
						var set = first[rule.rhs[0]];
						for(var t in set)
						{
							if(!first[rule.lhs.name][t])
							{
								stable = false;
								first[rule.lhs.name][t] = true;
							}
						}
					}
				}
			}
		}
	};

	this.writeTable = function(state, symbol, property, value)
	{
		if(!table.rows[state])
		{
			table.rows[state] = {};
		}

		if(!table.rows[state][symbol])
		{
			table.rows[state][symbol] = {};
		}

		if(property === 'reduce')
		{
			if(!table.rows[state][symbol].reduces)
			{
				table.rows[state][symbol].reduces = [];
			}
			table.rows[state][symbol].reduces.push(parseInt(value));
		}
		else
		{
			table.rows[state][symbol][property] = value;
		}
	};

	this.listConflicts = function()
	{
		for(var state in table.rows)
		{
			for(var symbol in table.rows[state])
			{
				var cell = table.rows[state][symbol];
				if(cell.reduces && cell.reduces.length > 2)
				{
					cell.conflicted = true;
					table.conflicts.push({
						type: 'reduce/reduce/*'
					});
				}
				else if(typeof(cell.shift) === "number" && cell.reduces && cell.reduces.length === 1)
				{
					var resolved = false;
					for(var r in resolutions)
					{
						var res = resolutions[r];
						if(res.reduce == cell.reduces[0] && res.shift == symbol)
						{
							if(res.decision === 'shift')
							{
								delete cell.reduces;
							}
							else
							{
								delete cell.shift;
							}
							resolved = true;
							break;
						}
					}

					if(!resolved)
					{
						cell.conflicted = true;
						table.conflicts.push({
							type: 'shift/reduce',
							state: state,
							symbol_or_rule: symbol,
							rule: ruleToString(rules[cell.reduces[0]]),
							options: [
								{
									name: 'Shift',
									shift: symbol,
									reduce: cell.reduces[0],
									decision: 'shift'
								},
								{
									name: 'Reduce',
									shift: symbol,
									reduce: cell.reduces[0],
									decision: 'reduce'
								}
							]
						});
					}
				}
				else if(cell.reduces && cell.reduces.length === 2)
				{
					cell.conflicted = true;
					table.conflicts.push({
						type: 'reduce/reduce'
					});
				}
			}
		}
	}

	this.computeParseTable = function()
	{
		this.computeFirstSets();

		var startItem = null;
		for(var r in rules)
		{
			if (rules[r].lhs.name === 'Start')
			{
				startItem = new Item(rules[r], 0, '$');
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

		this.listConflicts();

		return table;
	};

	this.isGrammarOk = function()
	{
		return grammarOk;
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
						this.writeTable(state, item.getLookAhead(), 'reduce', item.getRule().id);
						/*
						if(!reduces[state])
						{
							reduces[state] = [];
						}
						reduces[state].push(item.getRule().id);*/
						console.log("Reduce with", item.getRule().id, "in state", state, "on lookAhead", item.getLookAhead());
					}
					else if(item.getLookAhead() === '$')
					{
						this.writeTable(state, '$', 'accept', true);
					}
				}
			}
		}
	}

	this.closeItemSetAndFindNextOnes = function(itemSet, comingFrom)
	{
		itemSet.close({
			rules: rules,
			first: first
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
				this.writeTable(fromId, symbolName, 'shift', toId);
			}
			else
			{
				this.writeTable(fromId, symbolName, 'to', toId);
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
		var parser = new Parser({
			tokenizer: tokenizer,
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
		while(str !== '')
		{
			var token = null;

			for(var terminal in description.tokenizer)
			{
				var exp = new RegExp('^'+description.tokenizer[terminal]);
				var m = exp.exec(str);
				if(m)
				{
					str = str.substring(m[0].length);
					token = {
						type: 'terminal',
						name: terminal,
						value: m[0]
					}
					break;
				}
			}

			if(!token)
			{
				token = {
					type: 'terminal',
					name: str[0],
					value: str[0]
				};

				str = str.substring(1);
			}

			var ate = this.eat(token);
			if(ate !== true)
			{
				return ate;
			}
		}

		var eofParsed = this.eat({
			type: 'terminal',
			name: '$',
			value: 'EOF'
		});

		if(eofParsed === true)
		{
			return stack[0];
		}
		else
		{
			return "Parser ended in a non accepting state!";
		}
	};

	this.eat = function(token)
	{
		console.log("Eating token", token);
		var nextState;

		symbol = token.name || token;
		
		var reduced = this.applyReductions();

		var col = description.table[this.getState()];

		if(reduced !== true)
		{
			return reduced;
		}

		if( col
			&& col[symbol]
			&& typeof(col[symbol].shift) === "number")
		{
			var state = col[symbol].shift;
			this.push(state, token);
			return true;
		}
		else if( col && col[symbol] && symbol === '$' && col[symbol].accept)
		{
			return true;
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