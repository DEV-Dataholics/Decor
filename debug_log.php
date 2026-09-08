<?php
// Look for recent PHP exceptions or errors from the error log!
$log = file_exists('error_log') ? file_get_contents('error_log') : '';
echo substr($log, -2000);
?>
