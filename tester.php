<?php

$params = json_decode(file_get_contents('php://input'), true);

$regexp = $params['regexp'];

$replacements = array();

$regexp = preg_replace_callback('/<@(\w+):(.*?)@>/', function($m) use(&$replacements){
	$replacements['<@'.$m[1].'@>'] = $m[2];
	return $m[2];
}, $regexp);

$regexp = str_replace(array_keys($replacements), array_values($replacements), $regexp);

$test_string = $params['test_string'];

$response = array();

if($regexp !== null and $regexp !== '' and $test_string !== null and $test_string !== '')
{
	$matches = array();
	$n = preg_match_all($regexp, $test_string, $matches);

	$results = array();

	for($i=0; $i<$n; $i++)
	{
		$result = array('full_match' => '', 'captures' => array(), 'index' => $i);
		foreach($matches as $capture => $strings)
		{
			if($capture == 0)
			{
				$result['full_match'] = $strings[$i];
			}
			else
			{
				$result['captures'][$capture] = $strings[$i];
			}
		}
		$results[] = $result;
	}

	$response = array(
		'success' => true,
		'data' => array(
			'matches' => $results,
			'n' => $n,
			'copy_paste' => "'".addslashes($regexp)."'"
		)
	);
}
else
{
	$response['success'] = false;
	$response['message'] = 'Missing either regexp or test string.';
}

die(json_encode($response));