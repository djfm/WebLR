var module = angular.module('webLR', [], function($locationProvider) {
  $locationProvider.html5Mode(true);
});

(function()
{
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	canvas.width = 13;

	module.directive('vtext', function(){
	return{
		template: '<img title={{text}} alt={{text}} src="{{text_image}}">',
		link: function(scope, element, attrs)
		{
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.font = '10px sans-serif';
			
			var text = attrs.vtext;
			canvas.height = context.measureText(text).width;
			
			context.save();
			context.translate(canvas.width/2, canvas.height/2);
			context.rotate(-Math.PI/2);
			context.fillText(text, -canvas.height/2, 1);
			context.restore();

			scope.text_image = canvas.toDataURL();
			scope.text = text;
		}
	}
	});
})();




var ParserController = function($scope, $location)
{
	var parserGenerator;
	var tree = new TreeView('parseTree');

	var persistantScopeVariables = {
		tokenizer: {digit: '\\d'},
		grammar: [
			{lhs: {name: 'Start'}, rhs: [{name: 'E'}]},
			{lhs: {name: 'E'}, rhs: [{name: 'digit'}, {name: 'E'}]},
			{lhs: {name: 'E'}, rhs: [{name: 'digit'}]}
		],
		resolution: {},
		test_string: '123456' 
	};

	$scope.saveData = function()
	{
		var urlParameters = [];
		for(var v in persistantScopeVariables)
		{
			var json = angular.toJson($scope[v]);
			if(!$scope.loadedFromLocation)
			{
				localStorage.setItem(v, json);
			}
			urlParameters.push(v+"="+encodeURIComponent(json));
		}
		$scope.link = "?"+urlParameters.join("&");
	};

	$scope.loadData = function()
	{
		$scope.loadedFromLocation = false;
		for(var v in persistantScopeVariables)
		{
			var value;
			var fromLocation;
			if(fromLocation = $location.search()[v])
			{
				value = JSON.parse(fromLocation);
				$scope.loadedFromLocation = true;
			}
			else if((value = localStorage.getItem(v)) !== null)
			{
				value = JSON.parse(value);
			}
			else
			{
				value = persistantScopeVariables[v];
			}

			$scope[v] = value;
		}
	};

	$scope.rulesChanged = function()
	{
		$scope.saveData();
	};

	$scope.computeParseTable = function()
	{
		parserGenerator = new ParserGenerator(
			JSON.parse(angular.toJson($scope.tokenizer)),
			JSON.parse(angular.toJson($scope.grammar)),
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
		$scope.grammarString = $scope.grammar.map(ruleToString).join("\n");
	};

	$scope.grammarChanged = function()
	{
		$scope.grammar = [];
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
			$scope.grammar.push(rule);
		}

		$scope.saveData();
		$scope.computeParseTable();
	};

	$scope.solveConflict = function(option)
	{
		$scope.resolution[resolutionToString(option)] = option;
		$scope.saveData();
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

		$scope.saveData();
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
		$scope.saveData();
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
		location.search = "";
	};

	$scope.hideExplanations = function()
	{
		$scope.show_explanations = false;
		localStorage.setItem('show_explanations', $scope.show_explanations);
	};

	// Initialization
	$scope.link = '';
	$scope.show_explanations = localStorage.getItem('show_explanations') || true;
	$scope.max_table_columns = 10;
	$scope.tokenizer = {};  
	$scope.resolution = {};
	$scope.parseTableError = false;
	$scope.loadData();
	$scope.showTokenizer();
	$scope.showGrammar();
	$scope.showResolution();
	$scope.computeParseTable();
};