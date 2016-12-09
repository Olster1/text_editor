<?php require_once("includes/session.php"); ?>
<?php require_once("includes/database_connection.php"); ?>
<?php


	$query = "SELECT * FROM tags";
	$nameTagsAsArray = array();
	$error = null;
	$query_result = mysqli_query($db_handle, $query);
	if($query_result) {	
		while($row = mysqli_fetch_assoc($query_result)) {
			$rowId = $row[id];
			$tagsToPagesQuery = "SELECT * FROM pagesToTags, pages WHERE pagesToTags.tagId = '{$rowId}' AND pagesToTags.postId = pages.id";
			$postIds = array();
			$tagsToPagesQueryResult = mysqli_query($db_handle, $tagsToPagesQuery);
			if($tagsToPagesQueryResult)
			{
				while($row_linker_table = mysqli_fetch_assoc($tagsToPagesQueryResult)) {
					$postIds[] = array("id" => $row_linker_table["postId"], "title" => $row_linker_table["title"]);
				}
			} else {
				$error = mysqli_error($db_handle);
			}

			$nameTagsAsArray[] = array("name" => $row["name"], "postIds" => $postIds);
		} 
	} else {
		$error = mysqli_error($db_handle);
	}
	$result = array("error" => $error, "tags" => $nameTagsAsArray);
	echo json_encode($result);
?>