<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Parsing fun</title>
		<link rel="stylesheet" href="/public/vendor/css/foundation.css" />
		<link rel="stylesheet" href="/public/css/main.css" />
		<script src="/public/vendor/js/modernizr.js"></script>
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
		</div>
	</body>
	
	<script type="text/javascript" src="/public/js/ParserController.js"></script>
	<script type="text/javascript" src="/public/js/parser.js"></script>

</html>