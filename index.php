<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Parsing fun</title>
		<link rel="stylesheet" href="/public/vendor/css/foundation.css" />
		<link rel="stylesheet" href="/public/css/main.css" />
		<script src="/public/vendor/js/modernizr.js"></script>
		<script src="/public/vendor/js/d3.v3.min.js"></script>
		<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.2.5/angular.min.js"></script>
	</head>

	<body ng-app ng-controller='ParserController'>
		<h1>WebLR</h1>
		<div class="row">
			<div class="large-12 columns">
				<div ng-show="show_explanations" class="panel">
					<h2>Welcome!</h2>
					<p>In theory, this here is a LR(1) parser generator! The source code can be found on <a target="_blank" href="https://github.com/djfm/WebLR">GitHub</a>.</p>
					<p>The website itself uses cool web technologies so if you have problems browsing it you should consider using a decent browser (I mean, Chrome).</p>
					<p>
						Some basic explanations now:
						<ul>
							<li>The left hand side of a rule is seperated from the right hand side by an "=" (equal) sign</li>
							<li>Every symbol starting with a capital letter is considered a non terminal</li>
							<li>You can define special terminals using the tokenizer. The tokenizer is a really dumb one, it treats expressions as regexes and when parsing a string it returns the text corresponding to the first matching regex. If no regex matches at some point, then the next single char in the input string is used as a terminal.</li>
							<li>The program will not check that you don't do dumb stuff:
								<ul>
									<li><strong>Do not use '$' as a terminal in your grammar, it has a special meaning. If you need to use $, define it in the tokenizer</strong></li>
									<li><strong>Do not name your terminals with capital letters in the tokenizer, it will mysteriously fail</strong></li>
								</ul>
							</li>
						</ul>
					</p>
					<button ng-click="hideExplanations()">Ok, got it, hide this ugly panel.</button>
				</div>
				<p>All that you do is stored in localStorage, but if you want to start from a clean slate <a ng-click="clean()">click here</a>.</p>
			</div>
		</div>
		<div class="row">
			<div class="large-4 columns">
				<label for='tokenizer'>Tokenizer</label>
				<textarea id="tokenizer" ng-model='tokenizerString' ng-change='tokenizerChanged()'></textarea>
			</div>
			<div class="large-4 columns">
				<label for='grammar'>Grammar</label>
				<textarea id="grammar" ng-model='grammarString'></textarea>
			</div>
			<div class="large-4 columns">
				<label for='resolution'>Conflict resolution</label>
				<textarea id="resolution" ng-model='resolutionString' ng-change='resolutionChanged()'></textarea>
			</div>
		</div>
		<div class="row">
			<div class="large-12 columns">
				<label for='test-input'>Test string</label>
				<textarea id='test-input' ng-model='test_string' ng-change='saveToLocalStorage(); parse()'></textarea>
			</div>
		</div>
		<div class="row">
			<div class="large-12 columns">
				<!--button ng-click='addRule()' class="tiny success">Add Rule</button-->
				<button ng-click='grammarChanged()' class="tiny">Compute Parse Table</button>
			</div>
		</div>
		<div class="row">
			<div class="large-12 columns">
				<div class="error" ng-show="parseTableError">
					{{parseTableError}}
				</div>
			</div>
		</div>
		<div ng-show='table' class="row">
			<div class="large-6 columns">
				<label for='parse-table'>Parse Table</label>
				<div ng-if="table.headers.length < max_table_columns">
					<table class="expanding" id='parse-table'>
						<tr>
							<th></th>
							<th ng-repeat='h in table.headers'>
								{{h}}
							</th>
						</tr>
						<tr ng-repeat='(r, row) in table.rows'>
							<th>{{r}}</th>
							<td ng-repeat="h in table.headers" class="parser-actions{{row[h].conflicted ? ' conflicted' : ''}}">
								<span class="parser-action shift" ng-if="row[h].shift">s{{row[h].shift}}</span>
								<span class="parser-action reduce" ng-repeat="red in row[h].reduces">r{{red}}</span>
								<span class="parser-action goto" ng-if="row[h].to">g{{row[h].to}}</span>
								<span class="parser-action accept" ng-if="row[h].accept">acc</span>
							</td>
						</tr>
					</table>
				</div>
				<div ng-if="table.headers.length >= max_table_columns">
					Parse table too big to be displayed properly.
				</div>
			</div>
			<div class="large-6 columns">
				<div ng-show="!conflicts"> 
					<div class="row">
						<div class="large-12 columns">
							<div class="error" ng-show="parseError">
								{{parseError}}
							</div>
						</div>
					</div>
					<div ng-show="parseError === false" class="row">
						<div class="large-12 columns">
							<svg id='parseTree'></svg>
						</div>
					</div>
				</div>
				<div class="row" ng-show="conflicts">
					<div class="large-12 columns">
						<label>Conflicts in your grammar</label>
						<table class="expanding">
							<tr>
								<th>Type</th>
								<th>State</th>
								<th>Symbol/Rule</th>
								<th>Rule</th>
								<th>Resolution</th>
							</tr>
							<tr ng-repeat="conflict in conflicts">
								<td>{{conflict.type}}</td>
								<td>{{conflict.state}}</td>
								<td>{{conflict.symbol_or_rule}}</td>
								<td>{{conflict.rule}}</td>
								<td>
									<a class="resolution-option" ng-repeat='option in conflict.options' ng-click='solveConflict(option)'>{{option.name}}</a>
								</td>
							</tr>
						</table>
					</div>
				</div>
			</div>
		</div>
	</body>
	
	<script type="text/javascript" src="/public/js/ParserController.js"></script>
	<script type="text/javascript" src="/public/js/parser.js"></script>
	<script type="text/javascript" src="/public/js/treeView.js"></script>
</html>