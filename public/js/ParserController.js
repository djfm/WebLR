var ParserController = function($scope)
{
	$scope.saveToLocalStorage = function()
	{
		localStorage.setItem('rules', angular.toJson($scope.rules));
	};

	$scope.loadFromLocalStorage = function()
	{
		var rules = JSON.parse(localStorage.getItem('rules'));

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
		var parser = new Parser(JSON.parse(angular.toJson($scope.rules)));
		var table = parser.computeParseTable();

		if(typeof table === 'string')
		{
			$scope.parseTableError = table;
			return;
		}
		else
		{
			$scope.parseTableError = false;
		}
	}

	// Initialization

	$scope.parseTableError = false;
	$scope.loadFromLocalStorage();
};