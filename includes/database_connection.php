<?php 
	// DEFINE("DB_SERVER", "localhost");
	// DEFINE("DB_USER", "oliver");
	// DEFINE("DB_PASSWORD", "p");
	// DEFINE("DB_NAME", "personal_blog");

	DEFINE("DB_SERVER", "localhost");
	DEFINE("DB_USER", "root");
	DEFINE("DB_PASSWORD", "root");
	DEFINE("DB_NAME", "wiki_health");


	$db_handle = mysqli_connect(DB_SERVER, DB_USER, DB_PASSWORD, DB_NAME);

	if(!$db_handle)
	{
		exit("Could not connect to database" . mysqli_connect_error());
	}
?>