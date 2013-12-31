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
		<div class="row">
			<div class="large-12 columns">
				<div class="row" ng-repeat='(r, rule) in rules'>
					<div class="large-2 columns">
						<input type="text" ng-model='rule.lhs.name' ng-blur="saveToLocalStorage()"/>
					</div>
					<div class="large-1 columns">
						<span class="label">=</span>
					</div>
					<div class="large-8 columns">
						<div class="rhs-component" ng-repeat='(i, component) in rule.rhs'>
							<div class="row collapse">
								<div class="large-2 columns">
									<label for="" class="prefix" ng-click='removeComponent({rule: rule, which: i});'>
										X
									</label>
								</div>
								<div class="large-8 columns">
									<input type="text" ng-model="component.name" ng-blur="saveToLocalStorage()">
								</div>
								<div class="large-2 columns">
									<span ng-click='addComponent({rule: rule, after: i})' class="clickable postfix success">+</label>
								</div>
							</div>
						</div>
					</div>
					<div class="large-1 columns">
						<button class="tiny alert" ng-click='removeRule(r)'>-</button>
					</div>
				</div>
			</div>
		</div>
		<div class="row">
			<div class="large-12 columns">
				<button ng-click='addRule()' class="tiny success">Add Rule</button>
				<button ng-click='computeParseTable()' class="tiny">Compute Parse Table</button>
			</div>
		</div>
		<div class="row">
			<div class="large-12 columns">
				<div class="error" ng-show="parseTableError">
					{{parseTableError}}
				</div>
			</div>
			<div ng-show='table' class="row">
				<div class="large-6 columns">
					<label for='parse-table'>Parse Table</label>
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
				<div class="large-6 columns">
					<div class="row">
						<div class="large-12 columns">
							<label for='test-input'>Test string</label>
							<textarea id='test-input' ng-model='test_string' ng-change='saveToLocalStorage(); parse()'></textarea>
						</div>
					</div>
					<div class="row">
						<div class="large-12 columns">
							<div class="error" ng-show="parseError">
								{{parseError}}
							</div>
						</div>
					</div>
					<div class="row">
						<div class="large-12 columns">
							<svg id='parseTree'></svg>
						</div>
					</div>
				</div>
			</div>
		</div>
	</body>
	
	<script type="text/javascript" src="/public/js/ParserController.js"></script>
	<script type="text/javascript" src="/public/js/parser.js"></script>
	<script type="text/javascript" src="/public/js/treeView.js"></script>
</html>