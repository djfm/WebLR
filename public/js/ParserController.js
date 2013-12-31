var ParserController = function($scope)
{
	var parserGenerator;
	var tree = new Tree('parseTree');

	$scope.saveToLocalStorage = function()
	{
		localStorage.setItem('rules', angular.toJson($scope.rules));
		localStorage.setItem('test_string', angular.toJson($scope.test_string));
	};

	$scope.loadFromLocalStorage = function()
	{
		var rules = JSON.parse(localStorage.getItem('rules'));
		$scope.test_string = JSON.parse(localStorage.getItem('test_string'));

		if(rules)
		{
			$scope.rules = rules;
		}
		else
		{
			$scope.rules = [
				{
					lhs: {name: 'Start'},
					rhs: [
						{
							name: 'item'
						},
						{
							name: 'item 2'
						}
					]
				}
			];
		}
	};

	$scope.addComponent = function(params)
	{
		params.rule.rhs.splice(params.after+1, 0, {
			name: ''
		});
		$scope.rulesChanged();
	};

	$scope.removeComponent = function(params)
	{
		if (params.rule.rhs.length > 1)
		{
			params.rule.rhs.splice(params.which, 1);
			$scope.rulesChanged();
		}
	};

	$scope.addRule = function()
	{
		$scope.rules.push({
			lhs: {name: ''},
			rhs: [{name: ''}]
		})
		$scope.rulesChanged();
	};

	$scope.removeRule = function(n)
	{
		$scope.rules.splice(n, 1);
		$scope.rulesChanged();
	};

	$scope.rulesChanged = function()
	{
		$scope.saveToLocalStorage();
	};

	$scope.computeParseTable = function()
	{
		parserGenerator = new ParserGenerator(JSON.parse(angular.toJson($scope.rules)));
		var table = parserGenerator.computeParseTable();

		if(typeof table === 'string')
		{
			$scope.parseTableError = table;
			$scope.table = null;
			return;
		}
		else
		{
			$scope.parseTableError = false;
			$scope.table = table;
		}
	};

	$scope.parse = function()
	{
		if(parserGenerator && parserGenerator.isGrammarOk())
		{
			var parsed = parserGenerator.parse($scope.test_string);
			if (typeof parsed === 'string')
			{
				$scope.parseError = parsed;
			}
			else
			{
				$scope.parseError = false;
				//var adapted = parsed;/*
				var adapted = Tree.removeMiddleNodes(parsed, function(node){
					return node.type === 'component';
				});//*/
				tree.setData(adapted);
				console.log("Parsed:",parsed);
				console.log("Adapted:", adapted);
			}
			
		}
		else
		{
			$scope.parseError = "Problem in your grammar?";
		}
	}

	// Initialization

	$scope.parseTableError = false;
	$scope.loadFromLocalStorage();
	$scope.computeParseTable();
	$scope.parse();
};