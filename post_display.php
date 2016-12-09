<?php require_once("includes/session.php"); ?>
<?php require_once("includes/database_connection.php"); ?>
<?php
	$pageContent = "";
	$error = "";
	if(isset($_GET["id"])) {
		$pageId = $_GET["id"];
		$query = "SELECT * FROM pages WHERE id = '{$pageId}'";
		$query_result = mysqli_query($db_handle, $query);
		if($query_result) {	
			while($row = mysqli_fetch_assoc($query_result)) {
				$pageContent = $row["text"];
			}
		} else {
			$error = mysqli_error($db_handle);
		}
	}
?>

<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Text Editor</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- <link rel="stylesheet" type="text/css" href="style.css"> -->
  </head>
  <body>
  <?php echo $pageContent; ?>	
  </body>
  </html>

