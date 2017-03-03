# text_editor
A text editor for converting plain text to html. Ideal for html forms when you would like a user to edit the content of their web pages. 

#How to use:
Just put the `text_editor.js` file into your project directory then include it in your html page. 
All you have to have is add:

`<div id="canvas-container"></div>`

where you would like a text area to go in your html form. Then when you send the form you us:

`getHtmlBuffer();`

to retrieve the html text. Then you can either display it or store it in your database. 

