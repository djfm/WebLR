var ParserController = function($scope)
{
	var parserGenerator;
	var tree;

	$scope.saveToLocalStorage = function()
	{
		localStorage.setItem('rules', angular.toJson($scope.rules));
		localStorage.setItem('test_string', angular.toJson($scope.test_string));
		localStorage.setItem('resolutions', angular.toJson($scope.resolutions));
	};

	$scope.loadFromLocalStorage = function()
	{
		var rules = JSON.parse(localStorage.getItem('rules'));
		$scope.test_string = JSON.parse(localStorage.getItem('test_string'));
		$scope.resolutions = JSON.parse(localStorage.getItem('resolutions')) || {};
		if(rules)
		{
			$scope.rules = rules;
			$scope.grammar = $scope.rulesToGrammarString();
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

	$scope.rulesChanged = function()
	{
		$scope.saveToLocalStorage();
	};

	$scope.computeParseTable = function()
	{
		parserGenerator = new ParserGenerator(
			JSON.parse(angular.toJson($scope.rules)),
			JSON.parse(angular.toJson($scope.resolutions))
		);
		var table = parserGenerator.computeParseTable();

		if(typeof table === 'string')
		{
			$scope.parseTableError = table;
			$scope.table = null;
			return;
		}
		else
		{
			if(table.conflicts.length === 0)
			{
				$scope.parseTableError = false;
				$scope.table = table;
				$scope.conflicts = false;
				if($scope.test_string != '')
				{
					$scope.parse();
				}
			}
			else
			{
				$scope.table = table;
				$scope.conflicts = table.conflicts;
				$scope.parseTableError = "Your grammar has conflicts.";
			}
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
			else if(parsed === false)
			{
				$scope.parseError = 'Unspecified parse error.';
			}
			else
			{
				if(!tree)
				{
					tree = new TreeView('parseTree');
				}
				$scope.parseError = false;
				var adapted = parsed;/*
				var adapted = Tree.removeMiddleNodes(parsed, function(node){
					return node.type === 'component';
				});//*/
				tree.setData(adapted);
			}
			
		}
		else
		{
			$scope.parseError = false;
		}
	}

	$scope.rulesToGrammarString = function()
	{
		return $scope.rules.map(ruleToString).join("\n");
	};

	$scope.grammarChanged = function()
	{
		$scope.rules = [];
		var lines = $scope.grammar.split(/\n+/);
		for(var l in lines)
		{
			var eq = lines[l].indexOf("=");
			var left = lines[l].substring(0, eq).trim();
			var right = lines[l].substring(eq+1).trim();
			var rule = {
				lhs: {
					name: left
				},
				rhs: right.split(/\s+/).map(function(name){
					return {
						name: name
					};
				})
			};
			$scope.rules.push(rule);
		}

		$scope.saveToLocalStorage();
		$scope.computeParseTable();
	};

	$scope.solveConflict = function(option)
	{
		$scope.resolutions[resolutionToString(option)] = option;
		$scope.saveToLocalStorage();
		$scope.showResolutions();
		$scope.computeParseTable();
	};

	$scope.showResolutions = function()
	{
		$scope.resolution = Object.keys($scope.resolutions).join("\n");
	};

	$scope.resolutionChanged = function()
	{
		$scope.resolutions = {};
		var lines = $scope.resolution.split(/\n+/);
		for(var l in lines)
		{
			var parts = lines[l].split(/\s+/);
			if(parts.length >= 3)
			{
				var decision = parts[parts.length-1];
				var desc = {};

				for(var i=0; i<parts.length-1; i++)
				{
					var m = /(\w+)\s*\(([^\)]+)\)/.exec(parts[i]);
					if(!m)
					{
						console.log("??", lines[l]);
					}
					else
					{
						desc[m[1].trim()] = m[2].trim();
					}
				}
				desc.decision = decision;

				$scope.resolutions[resolutionToString(desc)] = desc;
			}
		}

		$scope.saveToLocalStorage();
	};

	// Initialization

	$scope.resolutions = {};
	$scope.parseTableError = false;
	$scope.loadFromLocalStorage();
	$scope.showResolutions();
	$scope.computeParseTable();
};