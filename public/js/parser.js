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
					nonTerminal: rule.rhs[dotPos].name.match(/^[A-Z]/)
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
}

function Parser(rules)
{
	var itemSets = new ItemSets();

	// Needed for rules hashing
	for(var r in rules)
	{
		rules[r].id = r;
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
	};

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
			console.log(
				"Transition from",
				comingFrom.itemSet.getId(),
				"to",
				itemSet.getId(),
				"on", 
				comingFrom.symbol
			);
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
};

/*
(0) S → E
(1) E → E * B
(2) E → E + B
(3) E → B
(4) B → 0
(5) B → 1
*/