var ParserController = function($scope)
{
	var parserGenerator;
	var tree = new TreeView('parseTree');

	$scope.saveToLocalStorage = function()
	{
		localStorage.setItem('rules', angular.toJson($scope.rules));
		localStorage.setItem('test_string', angular.toJson($scope.test_string));
		localStorage.setItem('resolutions', angular.toJson($scope.resolution));
		localStorage.setItem('tokenizer', angular.toJson($scope.tokenizer));
	};

	$scope.loadFromLocalStorage = function()
	{
		var rules = JSON.parse(localStorage.getItem('rules'));
		$scope.test_string = JSON.parse(localStorage.getItem('test_string')) || "123456";
		$scope.resolution = JSON.parse(localStorage.getItem('resolutions')) || {};
		$scope.tokenizer = JSON.parse(localStorage.getItem('tokenizer')) || {digit: '\\d'};
		if(rules)
		{
			$scope.rules = rules;
		}
		else
		{
			$scope.rules = [
				{lhs: {name: 'Start'}, rhs: [{name: 'E'}]},
				{lhs: {name: 'E'}, rhs: [{name: 'digit'}, {name: 'E'}]},
				{lhs: {name: 'E'}, rhs: [{name: 'digit'}]}
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
			JSON.parse(angular.toJson($scope.tokenizer)),
			JSON.parse(angular.toJson($scope.rules)),
			JSON.parse(angular.toJson($scope.resolution))
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
				
				$scope.conflicts = false;
				if($scope.test_string != '')
				{
					$scope.parse();
				}
			}
			else
			{
				$scope.conflicts = table.conflicts;
				$scope.parseTableError = "Your grammar has conflicts.";
			}

			$scope.table = table;
		}
	};

	$scope.parse = function()
	{
		console.log($scope.test_string);
		if(parserGenerator && parserGenerator.isGrammarOk() && $scope.test_string)
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

	$scope.showGrammar = function()
	{
		$scope.grammarString = $scope.rules.map(ruleToString).join("\n");
	};

	$scope.grammarChanged = function()
	{
		$scope.rules = [];
		var lines = $scope.grammarString.split(/\n+/);
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
		$scope.resolution[resolutionToString(option)] = option;
		$scope.saveToLocalStorage();
		$scope.showResolution();
		$scope.computeParseTable();
	};

	$scope.showResolution = function()
	{
		$scope.resolutionString = Object.keys($scope.resolution).join("\n");
	};

	$scope.resolutionChanged = function()
	{
		$scope.resolution = {};
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

				$scope.resolution[resolutionToString(desc)] = desc;
			}
		}

		$scope.saveToLocalStorage();
	};

	$scope.tokenizerChanged = function()
	{
		$scope.tokenizer = {};
		var lines = $scope.tokenizerString.split(/\n+/);
		for(var l in lines)
		{
			var line = lines[l];
			var eqpos = line.indexOf("=");
			var left = line.substring(0, eqpos).trim();
			var right = line.substring(eqpos+1).trim();
			$scope.tokenizer[left] = right;
		}
		delete $scope.tokenizer[""];
		$scope.saveToLocalStorage();
	};

	$scope.showTokenizer = function()
	{
		var lines = [];
		for(var i in $scope.tokenizer)
		{
			lines.push(i+" = "+$scope.tokenizer[i]);
		}
		$scope.tokenizerString = lines.join("\n");
	};

	$scope.clean = function()
	{
		localStorage.clear();
		location.reload();
	};

	$scope.hideExplanations = function()
	{
		$scope.show_explanations = false;
		localStorage.setItem('show_explanations', $scope.show_explanations);
	};

	// Initialization
	$scope.show_explanations = localStorage.getItem('show_explanations') || true;
	$scope.max_table_columns = 10;
	$scope.tokenizer = {};  
	$scope.resolution = {};
	$scope.parseTableError = false;
	$scope.loadFromLocalStorage();
	$scope.showResolution();
	$scope.showTokenizer();
	$scope.showGrammar();
	$scope.computeParseTable();
};