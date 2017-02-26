var HtmlBuffer = "";

function getHtmlBuffer() {
  return HtmlBuffer;
}

window.onload = function() {
  var TESTING_ENVIRONMENT = false;
  var cursorPosition = 0;
  var buffer = [{value: 0, attributes: 0}];
  var lineBuffer = [];
  var copyBuffer = [];
  var undoBuffer = [];
  var wordBuffer = [];
  var wordIndexes = []; //just for words; no white space
  var links = [];
  var bold = {value: false};
  var italic = {value: false};
  var fontSize = {value: 21};
  var BOLD_FLAG_SHIFT = 0;
  var ITALIC_FLAG_SHIFT = 1;
  var container = document.getElementById("canvas-container");
  var canvas = document.createElement("CANVAS");
  var findTagButton = document.getElementById("find-tags-btn");
  var highlightOn = false;
  var shiftDown = false;
  var highlightBeginIndex = 0;
  var highlightEndIndex = 0;
  var recompileWords = true;
  var indexesEffected = [];
  var globalTags = [];
  var globalMouseP = {x: 0, y: 0};
  var UI_Elements = [null];
  var interactingElementIndex = 0;
  var hotInteractionIndex = 0;
  var nextHotInteractionIndex = 0;
  var globalMousePressed = false;
  var globalMouseReleased = false;
  var TOOL_BAR_HEIGHT = 60;
  var toolbarDim = createDimension(0, 0, canvas.width, TOOL_BAR_HEIGHT);
  var lineWrapOn = {value: true};
  var menuToggle = {value: false};
  var lineSpacing = {value: 1.0};
  var cursorTimer = {value: 0.0, maxTime: 1.0, visible: true};
  

  var FONT_SIZE_MIN = 16;
  var FONT_SIZE_MAX = 72;
  var lineHeights = [15, 15, 16, 18, 19, 20, 21, 21, 22, 24, 25, 25, 26, 28, 29, 29, 30, 31, 32, 33, 34, 35, 35, 37, 38, 38, 39, 40, 42, 42, 43, 44, 45, 46, 47, 48, 48, 50, 51, 51, 52, 53, 55, 55, 56, 57, 58, 59, 60, 61, 61, 63, 64, 64, 65, 66, 68];


  function appendFontString(name, size, bold = false, italic = false) {
    var boldString = bold ? "bold" : "";
    var italicString = italic ? "italic" : "";
    var result = italicString + " " + boldString + " " + size + "px " + name;
    return result;
  }

  
  function setCanvasDim() {
    var canvasScale = 0.7; //canvas scale
    var canvasWidthToHeight = 9 / 16;
    canvas.width = window.innerWidth*canvasScale;
    canvas.height = canvasWidthToHeight*canvas.width;
    toolbarDim = updateDimension(0, 0, canvas.width, TOOL_BAR_HEIGHT, toolbarDim);
  }
  
  var scrollAt = {x: 0, y: 0};
  var scrollVel = {x: 0, y: 0};
  
  setCanvasDim();
  canvas.style.border = "1px solid black";
  canvas.tabIndex = 1;
  container.appendChild(canvas);  

  var ctx = canvas.getContext("2d");
  var fontName = "Arial";
  ctx.font = appendFontString(fontName, Math.floor(fontSize.value));

  function calculateLineHeight(size) {
    var oldFont = ctx.font;
    ctx.font = appendFontString(fontName, size);
    var result = findStringHeight("gM");
    ctx.font = oldFont;
    return result;
  }

  //NOTE(ollie): This is needed to calculate the line heights for different font sizes -> Offstream asset system
  // for(var i = FONT_SIZE_MIN; i <= FONT_SIZE_MAX; i++) {
  //   lineHeights.push(calculateLineHeight(i));
  // }


  function getLineHeight(size) {
    var index = Math.floor(size) - FONT_SIZE_MIN;
    if(index < 0) {
      // alert("string size not added to array");
      index = 0;
    }

    return lineHeights[index];
  }


  SERVER_CALL_getTags();

  function createWordFromCharArray(wordAsArray) {
    var result = "";
    for(var i = 0; i < wordAsArray.length; ++i) {
      result += wordAsArray[i].value;
    }
    return result;
  }

  function findNumberOfWords(string) {
    var wordCount = 0;
    var index = 0;
    while(index < string.length) {
      while(index < string.length && isWhiteSpace(string[index])) {
        index++;
      }

      var wasWord = false;
      while(index < string.length && !isWhiteSpace(string[index])) {
        wasWord = true;
        index++;
      }
      if(wasWord) {
        wordCount++;
      }
    } 
    return wordCount;
  }

  function tLinear_to_tSineous(t) {
    var result = 0.5*Math.cos(t*Math.PI - Math.PI) + 0.5;

    return result;
  }

  function stringsMatch(A, lengthA, B, lengthB) {
    var result = true;
    if(lengthA === lengthB) {
      while(--lengthA !== 0 & --lengthB !== 0) {
        result &= (A[lengthA] === B[lengthB]);
      }
      result &= (lengthA === lengthB);
    } else {
      result = false;
    }
    return result;
  }

  function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  canvas.addEventListener('mousemove', function(evt) {
    globalMouseP = getMousePos(canvas, evt);
  }, false);

  canvas.addEventListener('mousedown', function(evt) {
    if(!globalMousePressed) {
      globalMousePressed = true;
    }
  }, false);

  canvas.addEventListener('mouseup', function(evt) {
    globalMousePressed = false;
    globalMouseReleased = true;
  }, false);

  function infinityInverseRect() {
    return {minX: 10000000000, minY: 10000000000, maxX: -10000000000, maxY: -10000000000};
  }

  function appendDimension(dimension, dimensionToAddTo) {
    if(dimension.minX < dimensionToAddTo.minX) {
      dimensionToAddTo.minX = dimension.minX;
    }
    if(dimension.minY < dimensionToAddTo.minY) {
      dimensionToAddTo.minY = dimension.minY;
    }
    if(dimension.maxX > dimensionToAddTo.maxX) {
      dimensionToAddTo.maxX = dimension.maxX;
    }
    if(dimension.maxY > dimensionToAddTo.maxY) {
      dimensionToAddTo.maxY = dimension.maxY;
    }
    return dimensionToAddTo;
  }

  function confirmLink(beginIndex, endIndex, postId) {
    links.push({beginIndex: beginIndex, endIndex: endIndex, idOfPage: postId});
  }

  function isSameElement(element1, element2) {
    return (element1.beginIndex === element2.beginIndex 
      && element1.endIndex === element2.endIndex 
      && element1.tagIndex === element2.tagIndex );
  }

  function getUIElementIndex(elementIn) {
    var result = 0;
    for(var UI_ElementIndex = 1; UI_ElementIndex < UI_Elements.length; ++UI_ElementIndex) {
      var testElement = UI_Elements[UI_ElementIndex];
      if(isSameElement(elementIn, testElement)) {
        result = UI_ElementIndex;
        break;
      }
    }
    return result;
  }

  function matchTags() {
    var tagsThatMatch = "";
    
    //TODO: hash words to avoid double loop, use the hash as an entry point into the word array
    for(var i = 1; i < globalTags.length; i++) {
      var tag = globalTags[i];
      var wordCount = findNumberOfWords(tag.name);
      wordCount += wordCount - 1;
      for(var j = 0; j < wordBuffer.length; j++) {
          var word = "";
          var indexesOfTagWord = [];
          var beginIndex = buffer.length;
          var endIndex = 0;
          var upToIndex = 0;
          for(var wordCountIndex = 0; wordCountIndex < wordCount; wordCountIndex++) {
            var wordIndex = j + wordCountIndex;
            if(wordIndex < wordBuffer.length) {
              if(!wordBuffer[wordIndex].isWhiteSpace) {
                indexesOfTagWord[upToIndex++] = wordIndex;
              }
                
                word += createWordFromCharArray(wordBuffer[wordIndex].word);

                if(wordBuffer[wordIndex].startCharIndex < beginIndex) {
                  beginIndex = wordBuffer[wordIndex].startCharIndex;
                } 

                if(wordBuffer[wordIndex].endCharIndex > endIndex) {
                  endIndex = wordBuffer[wordIndex].endCharIndex - 1;
                } 
            } else {
              break;
            }
          }
          if(stringsMatch(word, word.length, tag.name, tag.name.length)) {
            var wasInteractedWith = false;
            for(var tagIndexCount = 0; tagIndexCount < indexesOfTagWord.length; ++tagIndexCount) {
              var thisIndex = indexesOfTagWord[tagIndexCount];
              wordBuffer[thisIndex].tagIndex = i; //this should be an array of tags

              var thisWord = wordBuffer[thisIndex];

              var newElement = {dimension: thisWord.dimension, type: "tag", dimensionType: "absolute", hotPostId: null, posts: tag.postIds, beginIndex: beginIndex, endIndex: endIndex, tagIndex: tagIndexCount};

              var elementIndex = getUIElementIndex(newElement)
              if(elementIndex === 0) {
                  UI_Elements.push(newElement); 
              } else {
                UI_Elements[elementIndex].dimension = thisWord.dimension;
              }
            }
            tagsThatMatch += word + " ";
          }
      }
    }


    document.getElementById("tags-listing").innerHTML = tagsThatMatch;
  }


  // if(inBounds(globalMouseP, thisWord.dimension) && globalMousePressed) {
  // }

  // if(inBounds(globalMouseP, thisWord.dimension)) {
  //               hotInteraction = thisWord;
  // }

  function SERVER_CALL_getTags() {
    //#if MAMP isn't working 
    globalTags.splice(0, 0, null);  //so objects can reference tag index zero for null tag
    //#else
    //run mysql query to find all tags
    // var payLoad = {};
    // var request = new XMLHttpRequest();
    // request.onreadystatechange = function() {
    //   if(request.readyState == 4 && request.status == 200){
    //     var postResult = JSON.parse(request.responseText);
    //     if(postResult.errors) {
    //       document.getElementById("errors").innerHTML = postResult.error;
    //     } else {
    //       globalTags = postResult.tags; 

    //       globalTags.splice(0, 0, null);  //so objects can reference tag index zero for null tag
    //     }
        
    //   }
    // };

    // request.open('POST', './findTags.php', true);
    // request.setRequestHeader("Content-Type", "application/json");
    
    // request.send(JSON.stringify(payLoad)); 
  }

  if(TESTING_ENVIRONMENT === true) {
    findTagButton.addEventListener("click", function(e) {
      matchTags();
    });
  }

  function isAtStartOfBuffer(value) {
     return (value === 0);
  }

  function isAtEndOfBuffer(value) {
     return (value === (buffer.length - 1));
  }

  function cursorPosWithClamp(cursorPosition, addend) {
    cursorPosition += addend;
    if(cursorPosition < 0) {
        cursorPosition = 0;
    }
    if(cursorPosition > (buffer.length - 1)) {
        cursorPosition = (buffer.length - 1);
    }
    return cursorPosition;
  }

  function isBold(attributes) {
    return (attributes & (1 << BOLD_FLAG_SHIFT));
  }

  function isItalic(attributes) {
    return (attributes & (1 << ITALIC_FLAG_SHIFT));
  }

  function parseCharBufferToHtml(charBuffer) {
    var result = "";
    var resultIndex = 0;
    var boldTagOpen = false;
    var italicTagOpen = false;
    var paragraphOpen = false;
    var anchorOpen = false;
    var lastCharacter = 0;
    var font = "";
    var currentSize = 0;
    var styleOpen = false;
    for(var charIndex = 1; charIndex < charBuffer.length; ++charIndex) {
      var character = charBuffer[charIndex];

      var linkAt = getLink(charIndex); 
      characterToAdd = "";

      

      switch(character.value) {
        case 0: {

        } break;
        case "Enter": {
          if(lastCharacter === "Enter") {
            result += "<br />";
          } else {
            if(paragraphOpen) {
              if(styleOpen) {
                result += "<span />";
                styleOpen = false;
              } 
              result += "</p>";
              paragraphOpen = false;
            }  
          }
        } break;
        default: {
          if(!paragraphOpen) {
           result += "<p>"; 
           paragraphOpen = true;
          }
          if(linkAt !== 0) {
            if(linkAt.isStart) {
              result += "<a href='./post_display.php?id=" + linkAt.idOfPage + "'>";
              anchorOpen = true;
            }  
          }

          if(isBold(character.attributes.flags)) {
            if(!boldTagOpen) {
              boldTagOpen = true;
              result += "<b>"
            }
          } else {
            if(boldTagOpen) {
              boldTagOpen = false;
              result += "</b>"
            }
          }
          
          if(isItalic(character.attributes.flags)) {
            if(!italicTagOpen) {
              italicTagOpen = true;
              result += "<i>"
            }
          } else {
            if(italicTagOpen) {
              italicTagOpen = false;
              result += "</i>"
            }
          }
          if(character.attributes.size !== currentSize || !styleOpen) {
            currentSize = character.attributes.size;
            if(styleOpen) {
              result += "<span />";
            } 
            result += "<span style='font-size: " + currentSize + "pt'>";
            styleOpen = true;
          }
          result += character.value;
        }
      }

      if(linkAt !== 0) {
        if(!linkAt.isStart && anchorOpen) {
          result += "</a>";
          anchorOpen = false;
        }  
      }
      
      lastCharacter = character.value;
    }

    if(styleOpen) {
      result += "</span>"
    }
    if(italicTagOpen) {
      result += "</i>"
    }
    if(boldTagOpen) {
      result += "</b>"
    }
    if(paragraphOpen) {
      result += "</p>"
    }
    return result;
  }

  function cursorPosWithClampAndInfo(cursorPosition, addend) {
    cursorPosition += addend;
    var atEdge = false;
    if(cursorPosition < 0) {
        cursorPosition = 0;
        atEdge = true;
    }
    if(cursorPosition > (buffer.length - 1)) {
        cursorPosition = (buffer.length - 1);
        atEdge = true;
    }
    return {cursorPosition: cursorPosition, atEdge: atEdge};
  }

  function isWhiteSpace(value) {
     return(value === " " || value === "Enter" || value === 0);
  }

  canvas.addEventListener("keyup", function(e) {
    if(e.key === "Shift") {
      shiftDown = false;
    }
  });
  canvas.addEventListener("keydown", function(e) {
    resetCursor(cursorTimer);
    if(e.key === "ArrowLeft") {
      if(!shiftDown && highlightOn) {
        highlightOn = false;
      } else {
        if(e.altKey) {
          while(!isAtStartOfBuffer(cursorPosition) && isWhiteSpace(buffer[cursorPosition].value)) {
            cursorPosition = cursorPosWithClamp(cursorPosition, -1);   
          }

          while(!isAtStartOfBuffer(cursorPosition) && !isWhiteSpace(buffer[cursorPosition].value)) {
            cursorPosition = cursorPosWithClamp(cursorPosition, -1);   
          }

        } else {
          cursorPosition = cursorPosWithClamp(cursorPosition, -1);    
        }
        highlightEndIndex = cursorPosition;
      }
    } else if(e.key === "ArrowRight") {
      if(!shiftDown && highlightOn) {
        highlightOn = false;
      } else {
        if(e.altKey) {
          while(!isAtEndOfBuffer(cursorPosition) && isWhiteSpace(buffer[cursorPosition + 1].value)) {
            cursorPosition = cursorPosWithClamp(cursorPosition, 1);   
          }

          while(!isAtEndOfBuffer(cursorPosition) && !isWhiteSpace(buffer[cursorPosition + 1].value)) {
            cursorPosition = cursorPosWithClamp(cursorPosition, 1);   
          }
        } else {
          cursorPosition = cursorPosWithClamp(cursorPosition, 1);  
        }
        highlightEndIndex = cursorPosition;
      }
    } else if(e.key === "ArrowUp") {
      if(!shiftDown && highlightOn) {
        highlightOn = false; 
      } else {
        if(buffer.length !== lineBuffer.length) {
          alert("invalid code path: buffers not same size");
        }
        if(!isAtStartOfBuffer(cursorPosition) && buffer.length !== 0) {
          var linePosInfo = lineBuffer[cursorPosition];
          var newCursorIndex = cursorPosition;
          var lineAt = linePosInfo.lineAt;
          if(lineAt !== 0) {
            targetIndex = lineAt - 1;
            while(true) {
              var testLineInfo = lineBuffer[newCursorIndex];
              var safetyMargin = 0.4*testLineInfo.characterWidth; 
              if(testLineInfo.lineAt === targetIndex && 
                (linePosInfo.xPos + safetyMargin) >= testLineInfo.xPos) { 
                break;
              } 

              if(testLineInfo.lineAt < targetIndex) {
                // newCursorIndex++;
                break;
              }

              --newCursorIndex;

              if(newCursorIndex <= 0) {
                break;
              }
            }
            cursorPosition = newCursorIndex;
          }
        }
        highlightEndIndex = cursorPosition;
      }
    } else if(e.key === "ArrowDown") {
      if(!shiftDown && highlightOn) {
        highlightOn = false;
      } else {
        if(buffer.length !== lineBuffer.length) {
          alert("invalid code path: buffers not same length");
        }
        if(buffer.length > 0) {
          var linePosInfo = null;
          var newCursorIndex = null;
          if(isAtStartOfBuffer(cursorPosition)) {
            newCursorIndex = cursorPosition + 1;
            linePosInfo = {xPos: 0, lineAt: 0, characterWidth: 10};
            if(buffer[newCursorIndex].value === "Enter") {
              linePosInfo.lineAt++;
            }
          } else {
            linePosInfo = lineBuffer[cursorPosition];
            newCursorIndex = cursorPosition;
          }
          var lineAt = linePosInfo.lineAt;
          if(lineAt !== lineBuffer.length) {
            targetIndex = lineAt + 1;
            while(true) {
              var testLineInfo = lineBuffer[newCursorIndex];
              var safetyMargin = 0; 
              if(testLineInfo.lineAt === targetIndex && 
                (linePosInfo.xPos + safetyMargin) <= testLineInfo.xPos) { 
                break;
              } 

              if(testLineInfo.lineAt > targetIndex) {
                --newCursorIndex;
                break;
              }

              ++newCursorIndex;

              if(newCursorIndex >= (lineBuffer.length - 1)) {
                break;
              }
            }
            cursorPosition = newCursorIndex;
          } else {
            console.log("can't go down");
          }
        }
        highlightEndIndex = cursorPosition;
      }
    } else if(e.key === "Shift") {
      highlightBeginIndex = cursorPosition;
      highlightEndIndex = cursorPosition;
      highlightOn = true;
      shiftDown = true;

    } else if(e.key === "Meta") {
      //do nothing
    } else if(e.key === "Alt") {
      //do nothing
    } else if(e.key === "Control") {
      //do nothing
    } else if (e.key === "Backspace") {
      recompileWords = true;

      if(!isAtStartOfBuffer(cursorPosition)) {
        if(highlightOn) {
          copyBuffer = [];
          var hlIndexes = getBeginAndEndHighglightIndexes();
          var i = hlIndexes.first + 1;
          var copyBufferIndex = 0;
          for(; i <= hlIndexes.second; ++i) {
            buffer.splice(i, 1);    
            indexesEffected.push(i);
          }
          cursorPosition = cursorPosWithClamp(cursorPosition, (hlIndexes.first - hlIndexes.second));  
        } else {
          indexesEffected.push(cursorPosition);
          buffer.splice((cursorPosition), 1);    
          cursorPosition = cursorPosWithClamp(cursorPosition, -1);  
        }
      }
      highlightOn = false;
    } else {
      recompileWords = true;
      highlightOn = false;
      var attributeFlags = (bold.value) << BOLD_FLAG_SHIFT | (italic.value) << ITALIC_FLAG_SHIFT;
      var attributes = {flags: attributeFlags, size: Math.floor(fontSize.value)}
      if(e.ctrlKey && e.key === "c") {
        copyBuffer = [];
        var hlIndexes = getBeginAndEndHighglightIndexes();
        var i = hlIndexes.first + 1;
        var copyBufferIndex = 0;
        for(; i <= hlIndexes.second; ++i) {
          copyBuffer[copyBufferIndex++] = buffer[i].value;
        }
      } else if(e.ctrlKey && e.key === "v") {

        for(var i = 0; i < copyBuffer.length; ++i) {
          indexesEffected.push(cursorPosition + 1);
          var character = copyBuffer[i];
          buffer.splice((cursorPosition + 1), 0, {value: character, attributes: attributes});
          cursorPosition = cursorPosWithClamp(cursorPosition, 1);
        }
      } else {
        indexesEffected.push(cursorPosition + 1);
        buffer.splice((cursorPosition + 1), 0, {value: e.key, attributes: attributes});
        cursorPosition = cursorPosWithClamp(cursorPosition, 1);
        if(e.key === " ") {
          return false;
        }
      }
    }
    
  }, true);
  



  //Router
  function handleNewHash() {
    var location = window.location.hash.replace(/^#\/?|\/$/g, '').split('/');
    switch (location[0])  {
    case '':

    	break;
    case 'contact':
      
      break;
    default:
      
      break;
    }
  }



  function findStringHeight(string) {

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'top';
    ctx.fillText(string, 0, 0);
    var min = canvas.height;
    var max = 0;
    var pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    for(var y = 0; y < canvas.height; ++y) {
      for(var x = 0; x < canvas.width; ++x) {
        var index = y*4*canvas.width + x*4;
        var r = pixels[index];
        var g = pixels[index + 1];
        var b = pixels[index + 2];
        var a = pixels[index + 3];
        
        if(r !== 0 ||
          g !== 0 ||
          b !== 0 || 
          a !== 0) {
            if(y < min) {
              min = y;
            }
            if(y > max) {
              max = y;
            }
        }
      }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return (max - min);
  }
  function clampMinV2(min, value) {
    var result = {x: value.x, y: value.y};
    if(result.x < min) {
      result.x = min;
    }
    if(result.y < min) {
      result.y = min;
    }
    return result;
  } 

  function calculateLineGap(size) {
    var lineHeight = getLineHeight(size);
    return lineHeight*lineSpacing.value;  
  }

  function offsetPos_v2(A, B) {
    return {x: A.x - B.x, y: A.y - B.y};
  }

  function clamp(min, value, max) {
    if(value < min) { value = min; }
    if(value > max) { value = max; }
    return value;
  }

  function updateCursor(cursorRelToOrigin, scrollAt, lineHeight, scrollUpdateInfo, drawCursor) {
    var cursorRel = offsetPos_v2(cursorRelToOrigin, scrollAt)
    if(drawCursor) {
      ctx.beginPath();
      ctx.moveTo(cursorRel.x, cursorRel.y);
      ctx.lineTo(cursorRel.x, cursorRel.y + lineHeight);
      ctx.stroke();
    }

    var targetScroll = {x: cursorRelToOrigin.x - (canvas.width / 2), y: cursorRelToOrigin.y - (canvas.height / 2)};
    if(scrollAt.y !== targetScroll.y) {
      
      if(!scrollUpdateInfo.updating) {
        scrollUpdateInfo.A = clampMinV2(0, scrollAt);
        scrollUpdateInfo.B = clampMinV2(0, targetScroll);
        scrollUpdateInfo.t = 0.0;
        scrollUpdateInfo.updating = true;

        
        scrollUpdateInfo.deltaTime = 1.0;
      } 
      if(lineWrapOn.value) {
       scrollUpdateInfo.A.x = 0.0; 
       scrollUpdateInfo.B.x = 0.0; 
      }
    }
    
  }

    

  function signOf(value) {
    var result = 1;
    if(value < 0) {
      result = -1;
    } 
    return result;
  }

  function absolute(value) {
    if(value < 0) {
      value *= -1;
    }
    return value;
  }

  function clampScroll(at, vel) {
    var minVelRange = 0.001;

    if(at.x < 0) {
      at.x = 0;
      vel.x = 0;
    }

    if(absolute(vel.x) < minVelRange) {
      vel.x = 0;
    }

    if(absolute(vel.y) < minVelRange) {
      vel.y = 0;
    }

    if(at.y < 0) {
      at.y = 0;
      vel.y = 0;
    }

    return {at: at, vel: vel};
  }

  function lerp(A, t, B) {
    return (B - A)*t + A;
  }

  function lerpV2(A, t, B) {
    return {x: ((B.x - A.x)*t + A.x), y: ((B.y - A.y)*t + A.y)};
  }

  function inverseLerp(A, value, B) {
    return (value - A)/(B - A);
  }

  function getBeginAndEndHighglightIndexes() {
    var highlightIndex1 = highlightBeginIndex;
    var highlightIndex2 = highlightEndIndex;

    var wasFlipped = false;
    if(highlightIndex2 < highlightIndex1) {
      var temp = highlightIndex1;
      highlightIndex1 = highlightIndex2;
      highlightIndex2 = temp;
      wasFlipped = true;
    }

    return {first: highlightIndex1, second: highlightIndex2, wasFlipped: wasFlipped};
  }

  function reintializeArrayToZero(size) {
    return Array.apply(null, Array(size)).map(Number.prototype.valueOf, 0);
  }

  function inBounds(pos, rect2) {
    var result = (pos.x >= rect2.minX && 
      pos.y >= rect2.minY && 
      pos.x < rect2.maxX && 
      pos.y < rect2.maxY); 

    return result;
  }

  function updateLinks(minIndex, maxIndex) {
    var range = maxIndex - minIndex;
    var result = false;
    for(var i = 0; i < links.length; ) {
      var link = links[i];
      if(link.beginIndex < minIndex && link.endIndex < minIndex) {
        ++i;
      } else if (link.beginIndex > maxIndex && link.endIndex > maxIndex) {
        ++i;
        link.beginIndex += range;
        link.endIndex += range;
      } else {
        result = true;
        links.splice(i, 1);
      }
      
      if(link.beginIndex >= minIndex) {
        link.beginIndex += range;
        link.endIndex += range;
      } 
    }
    return result;
  }

//TODO: this doesn't handle tags with the same index for begin and end
  function getLink(index) {
    var result = 0;
    for(var i = 0; i < links.length; ++i) {
      var link = links[i];
      if(link.beginIndex === index) {
        result = {idOfPage: link.idOfPage, isStart: true};
      }
      if(link.endIndex === index) {
        result = {idOfPage: link.idOfPage, isStart: false};
      }
    }
    return result;
  }


  function isLinkAlready(beginIndex, endIndex, removeIfFound = false) {
    var result = false;
    for(var i = 0; i < links.length; ++i) {
      var link = links[i];
      if(link.beginIndex === beginIndex && 
        link.endIndex === endIndex) {
        result = true; 
        if(removeIfFound) {
          console.log("remove");
          links.splice(i, 1);
        }
        break;
      }
    }
    return result;
  }

  function findMinMax(arrayOfNumbers) {
    var result = {min: 1000000, max: -1000000};
    for (var i = arrayOfNumbers.length - 1; i >= 0; i--) {
      var num = arrayOfNumbers[i];
      if(result.min > num) {
        result.min = num;
      }
      if(result.max < num) {
        result.max = num;
      }
    }
    return result;
  }

  function clearUITagElements() {
    for(var UI_ElementIndex = 1; UI_ElementIndex < UI_Elements.length; ) {
      var element = UI_Elements[UI_ElementIndex];
      if(element.type === "tag") {
        UI_Elements.splice(UI_ElementIndex, 1);
      } else {
        ++UI_ElementIndex;
      }
    }
  }

  function resetCursor(cursorTimer) {
    cursorTimer.value = 0;
    cursorTimer.visible = true;
  }

  function getTextWidth(text) {
    var res = 0;
    if(text === 'Enter') {
      return 0;
    }
    for(var i = 0; i < text.length; i++) {
      var c = text[i];
      var unicode = c.charCodeAt(0);
      res += ctx.measureText(c).width;
    }
    return res;
  }
    

  function getWordLengthInPixels(word) {
    var currentFont = ctx.font;
    var result = 0;
    for(var i = 0; i < word.length; ++i) {
      var character = word[i].value;
      var attributes = word[i].attributes;
      var bold = isBold(attributes.flags);
      var italic = isItalic(attributes.flags);
      ctx.font = appendFontString(fontName, attributes.size, bold, italic);
      result += getTextWidth(character);
    }
    ctx.font = currentFont;

    return result;
  }

  function percentagePosToPixelPos(dimensionAsPercent, dimensionRelTo) {
    var relWidth = dimensionRelTo.maxX - dimensionRelTo.minX;
    var relHeight = dimensionRelTo.maxY - dimensionRelTo.minY;
    var result = createDimension(dimensionAsPercent.minX*relWidth, dimensionAsPercent.minY*relHeight,
      dimensionAsPercent.maxX*relWidth, dimensionAsPercent.maxY*relHeight);
    return offsetDim({x: dimensionRelTo.minX, y: dimensionRelTo.minY}, result);
  }

  function dimWidth(dim) {
    return dim.maxX - dim.minX;
  }

  function dimHeight(dim) {
    return dim.maxY - dim.minY;
  }

  function fillRectDim(dim, color, ctx) {
    var oldColor = ctx.fillStyle;
    ctx.fillStyle = color;
    ctx.fillRect(dim.minX, dim.minY, dimWidth(dim), dimHeight(dim));
    ctx.fillStyle = oldColor;
  }

  function createDimension(minX, minY, maxX, maxY) {
    return {minX: minX, minY: minY, maxX: maxX, maxY: maxY};
  }

  function createDimensionWH(minX, minY, width, height) {
    return {minX: minX, minY: minY, maxX: minX + width, maxY: minY + height};
  }

  function updateDimension(minX, minY, maxX, maxY, dim) {
    dim.minX = minX;
    dim.minY = minY;
    dim.maxX = maxX;
    dim.maxY = maxY;
    return dim;
  }
  
  //TODO(ollie): this will be slow when there is lots of lines -> hash the lines for O(1) lookup 
  function getLineInfo(index) {
    var result = null;
    for(var i = 0; i < lineBuffer.length; ++i) {
      var lineInfo = lineBuffer[i];
      if(index >= lineInfo.beginIndex && index < lineInfo.endIndex) {
        result = lineInfo;
        break;
      }
    }
    return result;
    
  }

  function printLineBuffer() {
    console.log(lineBuffer);
  }

  function offsetDim(vec2, dim) {
    return createDimension(vec2.x + dim.minX, vec2.y + dim.minY, vec2.x + dim.maxX, vec2.y + dim.maxY)
  }

  function renderCharacterBuffer(renderPass, scrollUpdateInfo) {

    var hl = getBeginAndEndHighglightIndexes();
    var highlightIndex1 = hl.first;
    var highlightIndex2 = hl.second;

    var cursor = {x: 0, y: toolbarDim.maxY};
    var beginLineIndex = 0;
    var maxCharacterSize = 0;
    var lineIndexAt = 0;
    if(!renderPass) {
      lineBuffer = [];  
    }

    var totalIndex = 0;
    for(var wordAt = 0; wordAt < wordBuffer.length; ++wordAt) {
      var isWordWhiteSpace = false;//wordBuffer[wordAt].isWhiteSpace;
      var word = wordBuffer[wordAt].word;
      var tagIndex = wordBuffer[wordAt].tagIndex;
      var color = (tagIndex === 0) ? "#000000" : "#00ff00";
      var wordDim = infinityInverseRect();
      var onLastWord = (wordAt === (wordBuffer.length - 1));
      var wordLength = getWordLengthInPixels(word);
      if(lineWrapOn.value && ((cursor.x + wordLength) >= canvas.width) && !isWordWhiteSpace && 
        wordLength < canvas.width) {

        if(!renderPass) {
          var cursorOffset = offsetPos_v2(cursor, scrollAt);
          lineBuffer[lineIndexAt++] = {maxCharacterSize: maxCharacterSize, beginIndex: beginLineIndex, endIndex: totalIndex, minY: cursorOffset.y, height: getLineHeight(maxCharacterSize)};
          beginLineIndex = totalIndex;
        }
        cursor.y += calculateLineGap(maxCharacterSize);
        cursor.x = 0;  
        maxCharacterSize = 0;
      }

      for(var i = 0; i < word.length; ++i, ++totalIndex) {
        var character = word[i].value;
        var attributes = word[i].attributes;
        var bold = isBold(attributes.flags);
        var italic = isItalic(attributes.flags);
        ctx.font = appendFontString(fontName, attributes.size, bold, italic);
        if(maxCharacterSize < attributes.size) {
          maxCharacterSize = attributes.size;
        }
        ctx.fillStyle = color;
        var thisLineGap = calculateLineGap(maxCharacterSize);

        var characterWidth = getTextWidth(character);
        if(lineWrapOn.value && (cursor.x + characterWidth) >= canvas.width && !isWhiteSpace(character)) {
            //needed for when single words span multiple lines
            if(!renderPass) {
              var cursorOffset = offsetPos_v2(cursor, scrollAt);
              lineBuffer[lineIndexAt++] = {maxCharacterSize: maxCharacterSize, beginIndex: beginLineIndex, endIndex: totalIndex, minY: cursorOffset.y, height: getLineHeight(maxCharacterSize)};
              beginLineIndex = totalIndex;
            }
            cursor.y += thisLineGap;
            cursor.x = 0;
            maxCharacterSize = 0;
        }
        if(character === "Enter" || character === 0) {
          characterWidth = 0;
        }
        
        var cursorOffset = offsetPos_v2(cursor, scrollAt);
        var characterDim = {minX: cursorOffset.x, minY: cursorOffset.y, maxX: cursorOffset.x + characterWidth, maxY: cursorOffset.y + getLineHeight(attributes.size)};
        wordDim = appendDimension(characterDim, wordDim);
        
        if(globalMousePressed && inBounds(globalMouseP, characterDim)) {
          cursorPosition = clamp(0, totalIndex - 1, totalIndex);
        }

        wordBuffer[wordAt].dimension = wordDim;

        var onLastCharacter = onLastWord && (i === (word.length - 1));
        var renderCharacter = true;
        if(character === 0) {
          renderCharacter = false;
          //don't draw text
        } else if(character === "Enter" || onLastCharacter) {
          if(!renderPass) {
            var endIndex = (onLastCharacter) ? totalIndex + 1 : totalIndex;
            var cursorOffset = offsetPos_v2(cursor, scrollAt);
            lineBuffer[lineIndexAt++] = {maxCharacterSize: maxCharacterSize, beginIndex: beginLineIndex, endIndex: endIndex, minY: cursorOffset.y, height: getLineHeight(maxCharacterSize)};
            beginLineIndex = totalIndex;
          }
          if(character === "Enter") {
            cursor.y += thisLineGap;
            cursor.x = 0;
            renderCharacter = false;
            maxCharacterSize = 0;
          }
        } 

        var lineInfo = getLineInfo(totalIndex);
        var lineInfoHeight = (lineInfo === null) ? getLineHeight(fontSize.value) : lineInfo.height;
        if(lineInfo === null && renderPass) {
        }
        if(renderPass && renderCharacter) {
          var offsetP = offsetPos_v2({x: cursor.x, y: cursor.y + lineInfoHeight}, scrollAt);
          ctx.fillText(character, offsetP.x, offsetP.y);
          if(highlightOn && (i > highlightIndex1 && i <= highlightIndex2)) {
            // console.log("begin index " + highlightBeginIndex);
            // console.log("end index " + highlightEndIndex);
            ctx.strokeRect(offsetP.x, offsetP.y, characterWidth, lineInfoHeight);
          }
        }

        cursor.x += characterWidth;

        if(renderPass && totalIndex === cursorPosition) {
          updateCursor(cursor, scrollAt, lineInfoHeight, scrollUpdateInfo, cursorTimer.visible);
        }
        
      }
    }
  }

  function getWidth(dim) {
    return dim.maxX - dim.minX;
  }

  function getHeight(dim) {
    return dim.maxY - dim.minY;
  }

  function getUIButtonWidth(element) {
    var result = 0;
    switch(element.type) {
      case "toggle": {
        if(element.dimensionType === "percentage") {
          result = getWidth(percentagePosToPixelPos(element.dimension, element.dimensionRelTo));
        } else if(element.dimensionType === "packed") {
          var fontSize = element.letterSize;
          ctx.font = appendFontString(fontName, element.letterSize, false, false);
          result = getTextWidth(element.name);
        }
      }
    }
    return result;
  }

  function renderElement(element, indexUpTo, UI_ElementIndex, packedX, packedY, canvasWidth, ignoreBoundary, moveInX, menuToggleButtonWidth) {

    var interactDimension = element.dimension;
      var btnDim = element.dimension;
      var buttonText = "";
      var marginX = 20;
      var marginY = 4;
      var completeRender = true;
      var activeColor = "#fb8e8e";
      var onColor = "#8e8efb";
      var offColor = "#fecf7e";
      if(element.type !== "tag") {
        var buttonColor = (element.valueToToggle.value) ? onColor : offColor;
        if(UI_ElementIndex === hotInteractionIndex) {
          buttonColor = activeColor;
        }
        var relWidth = element.dimensionRelTo.maxX - element.dimensionRelTo.minX;
        var relHeight = element.dimensionRelTo.maxY - element.dimensionRelTo.minY;
        switch(element.type) {
          case "toggle": {
            if(element.dimensionType === "percentage") {
              btnDim = percentagePosToPixelPos(element.dimension, element.dimensionRelTo);
            } else if(element.dimensionType === "packed") {
              var fontSize = element.letterSize;
              ctx.font = appendFontString(fontName, element.letterSize, false, false);
              var charWidth = getTextWidth(element.name);
              var charHeight = getLineHeight(element.letterSize);
              buttonText = element.name;
              if(packedX.value + charWidth + menuToggleButtonWidth + marginX < canvasWidth || ignoreBoundary) {
                btnDim = {minX: packedX.value, maxX: packedX.value + charWidth, minY: packedY.value, maxY: packedY.value + charHeight};
                if(moveInX) {
                  packedX.value += charWidth + marginX;   
                } else {
                  packedY.value += charHeight + marginY;    
                }
              } else {
                indexUpTo.value = UI_ElementIndex;
                var elementIndex = UI_Elements.length - 1;
                var packedXTemp = {value: canvasWidth - menuToggleButtonWidth};
                renderElement(UI_Elements[elementIndex], indexUpTo, elementIndex, packedXTemp, packedY, true, true, menuToggleButtonWidth);
                completeRender = false;
              } 
            }
          } break;
          case "slider": {
            var sliderDim = createDimension(0, 0, 0, 0);
            if(element.dimensionType === "percentage") {
              sliderDim = percentagePosToPixelPos(element.dimension, element.dimensionRelTo);
              element.dim = sliderDim;
            } else if(element.dimensionType === "packed") {
              var fontSize = element.letterSize;
              var barWidth = 100;
              var barHeight= 20;
              ctx.font = appendFontString(fontName, element.letterSize, false, false);
              var totalWidth = getTextWidth(element.name);
              if(totalWidth < barWidth) {
                totalWidth = barWidth;
              } 
              var charHeight = getLineHeight(element.letterSize);
              if(packedX.value + barWidth + menuToggleButtonWidth + marginX < canvasWidth || ignoreBoundary) {
                ctx.fillStyle = "#000000";
                ctx.fillText(element.name, packedX.value, packedY.value);  
                sliderDim = {minX: packedX.value, maxX: packedX.value + barWidth, minY: packedY.value, maxY: packedY.value + barHeight};
                element.dim = sliderDim;
                if(moveInX) {
                  packedX.value += totalWidth + marginX;
                } else {
                  packedY.value += charHeight + marginY;    
                }
              } else {
                indexUpTo.value = UI_ElementIndex;
                var elementIndex = UI_Elements.length - 1;
                var packedXTemp = {value: canvasWidth - menuToggleButtonWidth};
                renderElement(UI_Elements[elementIndex], indexUpTo, elementIndex, packedXTemp, packedY, canvasWidth, true, true, menuToggleButtonWidth);
                completeRender = false;
              }
            }
            if(completeRender) {
              fillRectDim(sliderDim, "#f0f0f0", ctx); 
            }

            var sliderPercent = inverseLerp(element.sliderMin, element.valueToToggle.value, element.sliderMax);

            var xPos = lerp(sliderDim.minX, sliderPercent, sliderDim.maxX);
            btnDim = createDimensionWH(xPos, sliderDim.minY, 0.1*dimWidth(sliderDim), 1.5*dimHeight(sliderDim));
          } break;
        }
        if(completeRender) {
          fillRectDim(btnDim, buttonColor, ctx); 
          ctx.fillStyle = "#000000";
          ctx.fillText(buttonText, btnDim.minX, btnDim.maxY);  
        }
      } //if interaction is not a tag
      if(inBounds(globalMouseP, btnDim) && completeRender) {
        nextHotInteractionIndex = UI_ElementIndex;
      }

      return completeRender;
  }

  function renderToolBar(UIElementStartingIndex, packedX, packedY, canvasWidth, ignoreBoundary, moveInX, menuToggleButtonWidth) {
    
    var indexUpTo = {value: UI_Elements.length};
    var continueLoop = true;
    for(var UI_ElementIndex = UIElementStartingIndex; UI_ElementIndex < (UI_Elements.length - 1); ++UI_ElementIndex) {
      var element = UI_Elements[UI_ElementIndex];
      continueLoop = renderElement(element, indexUpTo, UI_ElementIndex, packedX, packedY, canvasWidth, ignoreBoundary, moveInX, menuToggleButtonWidth);
      if(!continueLoop) {
        indexUpTo = UI_ElementIndex;
        break;
      }
    }
    return {indexUpTo: indexUpTo, renderedBurgerButton: !continueLoop};
  }

  var scrollUpdateInfo = {A: {x: 0, y: 0}, t: 1, B: {x: 0, y: 0}, deltaTime: 1, updating: false};
  function mainLoop() {
    if(recompileWords) {

      recompileWords = false;
      var cursor = {x: 0, y: 0};
      wordBuffer = [];
      wordIndexes = [];
      var wordIndex = 0;
      clearUITagElements();
      var wordIndexBufferAt = 0;
      var indexAt = 0;
      while(indexAt !== buffer.length) {
        var word = [];
        var charIndex = 0;
        var beginIndex = indexAt;
        var wordWidth = 0;
        while(indexAt !== buffer.length && isWhiteSpace(buffer[indexAt].value)) {
          word[charIndex++] = buffer[indexAt];
          wordWidth += getTextWidth(buffer[indexAt].value);
          indexAt++;
        }
        var endIndex = indexAt;
        if(word.length !== 0) {
          wordBuffer[wordIndex++] = {word: word, isWhiteSpace: true, tagIndex: 0, startCharIndex: beginIndex, endCharIndex: endIndex, dimension: {minX: 0, minY: 0, maxX: 0, maxY: 0}};
        }

        word = [];
        beginIndex = indexAt;
        charIndex = 0;
        while(indexAt !== buffer.length && !isWhiteSpace(buffer[indexAt].value)) {
          word[charIndex++] = buffer[indexAt];
          indexAt++;
        }
        endIndex = indexAt;
        if(word.length !== 0) {
          wordIndexes[wordIndexBufferAt++] = wordIndex;
          wordBuffer[wordIndex++] = {word: word, isWhiteSpace: false, tagIndex: 0, startCharIndex: beginIndex, endCharIndex: endIndex, dimension: {minX: 0, minY: 0, maxX: 0, maxY: 0}};
        }

      }
      var range = findMinMax(indexesEffected);
      updateLinks(range.min, range.max);
      if(TESTING_ENVIRONMENT === true) {
        document.getElementById("html-test").innerHTML = parseCharBufferToHtml(buffer);  
      } else {
        HtmlBuffer = parseCharBufferToHtml(buffer);  
      }
      indexesEffected = [];

      renderCharacterBuffer(false, null);
    }

    if(TESTING_ENVIRONMENT === true) {
      matchTags();    
    }

    var dt = 0.03333;
    var accel = {x: 200, y: 200};
    var dragCoeff = 0.9;

    var accelCoeff = 1.0;

    if(scrollUpdateInfo.updating) {
      scrollAt = lerpV2(scrollUpdateInfo.A, tLinear_to_tSineous(scrollUpdateInfo.t / scrollUpdateInfo.deltaTime), scrollUpdateInfo.B);
    }
    scrollUpdateInfo.t += dt;
    if(scrollUpdateInfo.t >= scrollUpdateInfo.deltaTime) {
      scrollUpdateInfo.t = scrollUpdateInfo.deltaTime;
      scrollUpdateInfo.updating = false;
    }


    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'bottom';

    cursorTimer.value += dt;
    if(cursorTimer.value > cursorTimer.maxTime) {
      cursorTimer.visible = !cursorTimer.visible;
      cursorTimer.value = 0;
    }

    // toolbarDim = updateDimension(0, 0, canvas.width, 50, toolbarDim);
    renderCharacterBuffer(true, scrollUpdateInfo);
    
    var toolBarBackingColor = "#dafab1";
    var packedX = {value: 20};
    var packedY = {value: 25};
    ctx.fillStyle = toolBarBackingColor;
    ctx.fillRect(toolbarDim.minX, toolbarDim.minY, getWidth(toolbarDim), getHeight(toolbarDim)); // fill toolbar backing color
    var menuToggleButtonWidth = getUIButtonWidth(UI_Elements[UI_Elements.length - 1]);
    var res = renderToolBar(1, packedX, packedY, canvas.width, false, true, menuToggleButtonWidth);
    if(menuToggle.value && res.renderedBurgerButton) {
      packedX.value = 0.7*canvas.width;
      packedY.value = getHeight(toolbarDim);
      ctx.fillStyle = toolBarBackingColor;
      ctx.fillRect(packedX.value, packedY.value, canvas.width - packedX.value, canvas.height); 
      renderToolBar(res.indexUpTo, packedX, packedY, canvas.width, true, false, menuToggleButtonWidth);
    }
    


    if(interactingElementIndex === 0) {
      hotInteractionIndex = nextHotInteractionIndex;

      if(globalMousePressed && hotInteractionIndex !== 0) {
        interactingElementIndex = hotInteractionIndex;
        var element = UI_Elements[interactingElementIndex];
        switch(element.type) {
          case "toggle": { 
          } break;
          default: {

          }
        }
      }
    } 

    if(interactingElementIndex !== 0) {
      var element = UI_Elements[interactingElementIndex];
      
      switch(element.type) {
        case "tag": {
          var maxWidth = 0;
          var fontSize = 22;
          ctx.font = appendFontString(fontName, fontSize, false, false);
          var thisLineHeight = getLineHeight(fontSize);
          for(var postIndex = 0; postIndex < element.posts.length; ++postIndex) {
            var characters = element.posts[postIndex].title;
            var width = getTextWidth(characters);
            if(maxWidth < width) {
              maxWidth = width;
            }
          }

          var cursor = {x: element.dimension.minX, y: element.dimension.minY};
          var hasHotPostId = false;
          for(var postIndex = 0; postIndex < element.posts.length; ++postIndex) {
            var postInfo = element.posts[postIndex];
            ctx.fillStyle = "#808080";
            if(postIndex === element.hotPostId) {
              ctx.fillStyle = "#ffff00";
            }
            ctx.fillRect(cursor.x, cursor.y, maxWidth, thisLineHeight);
            ctx.fillStyle = "#000000";
            var characters = postInfo.title;
            var width = getTextWidth(characters);
            ctx.fillText(characters, cursor.x, cursor.y);  
            var dimension = {minX: cursor.x, minY: cursor.y, maxX: cursor.x + width, maxY: cursor.y + thisLineHeight};
            if(inBounds(globalMouseP, dimension)) {
              element.hotPostId = postIndex;
              hasHotPostId = true;
            }
            cursor.y += thisLineHeight;
          }

          var removeLink = false;
          if(isLinkAlready(element.beginIndex, element.endIndex)) {
            var buttonTitle = "remove link";
            var width = getTextWidth(buttonTitle);
            var dimension = {minX: cursor.x, minY: cursor.y, maxX: cursor.x + width, maxY: cursor.y + thisLineHeight};
            ctx.fillStyle = "#808080";
            if(inBounds(globalMouseP, dimension)) {
              ctx.fillStyle = "#ffff00";
              removeLink = true;
            } 
            ctx.fillRect(cursor.x, cursor.y, maxWidth, thisLineHeight);
            ctx.fillStyle = "#000000";
            ctx.fillText(buttonTitle, cursor.x, cursor.y);  
          }

          if(!hasHotPostId) {
            element.hotPostId = null;
          }

          if(globalMouseReleased) {
            if(element.hotPostId !== null) {
              var hotPostId = element.posts[element.hotPostId].id;
              confirmLink(element.beginIndex, element.endIndex, hotPostId);
            } else if(removeLink) {
              isLinkAlready(element.beginIndex, element.endIndex, true);
            }
            if(TESTING_ENVIRONMENT === true) {
              document.getElementById("html-test").innerHTML = parseCharBufferToHtml(buffer);  
            } else {
              HtmlBuffer = parseCharBufferToHtml(buffer);  
            }
            
            interactingElementIndex = 0;
            hotInteraction = 0;
          } 
        } break;
        case "toggle": {
          if(globalMouseReleased) {
            if(nextHotInteractionIndex === interactingElementIndex) {
              element.valueToToggle.value = !element.valueToToggle.value;  
              if(element.hasOwnProperty("function")) {
                element.function();
              }
            }
            interactingElementIndex = 0;
            hotInteraction = 0;
          } 
          
        } break;
        case "slider": {

          var valueAsPercent = inverseLerp(element.dim.minX, globalMouseP.x, element.dim.maxX);
          valueAsPercent = clamp(0, valueAsPercent, 1);
          element.valueToToggle.value = lerp(element.sliderMin, valueAsPercent, element.sliderMax);

          var numberPos = {x: clamp(element.dim.minX, globalMouseP.x, element.dim.maxX), y: lerp(element.dim.minY, 0.5, element.dim.maxY)};
          ctx.fillStyle = "#ffffff";
          ctx.textBaseline = 'top';
          ctx.fillText(Math.floor(element.valueToToggle.value), numberPos.x, numberPos.y); 
          ctx.textBaseline = 'bottom';

          if(globalMouseReleased) {
            interactingElementIndex = 0;
            hotInteraction = 0;
          } 
        } break;
        default: {

        }
      }
    } 
    

    globalMousePressed = false;
    globalMouseReleased = false;
    nextHotInteractionIndex = 0;
    
    requestAnimationFrame(mainLoop);
  }

  //fill tool bar with buttons
  var boldElement = {dimension: {}, letterSize: 22, name: "B", dimensionType: "packed", dimensionRelTo: toolbarDim, type: "toggle", valueToToggle: bold};

  var italicElement = {dimension: {}, letterSize: 22, name: "I", dimensionType: "packed", dimensionRelTo: toolbarDim, type: "toggle", valueToToggle: italic};

  var sizeElement = {dimension: {}, letterSize: 22, name: "font size", dimensionType: "packed", dimensionRelTo: toolbarDim, type: "slider", valueToToggle: fontSize, sliderMin: FONT_SIZE_MIN, sliderMax: FONT_SIZE_MAX, dim: {}};

  var lineSpacingElement = {dimension: {}, letterSize: 22, name: "spacing", dimensionType: "packed", dimensionRelTo: toolbarDim, type: "slider", valueToToggle: lineSpacing, sliderMin: 1.0, sliderMax: 10.0, dim: {}};

  var lineWrapOption = {dimension: {}, letterSize: 22, name: "V", dimensionType: "packed", dimensionRelTo: toolbarDim, type: "toggle", valueToToggle: lineWrapOn, function: function(){recompileWords = true}};

  var menuToggleElement = {dimension: {}, letterSize: 26, name: "\u2630", dimensionType: "packed", dimensionRelTo: toolbarDim, type: "toggle", valueToToggle: menuToggle};

  UI_Elements.push(boldElement); 
  UI_Elements.push(italicElement); 
  UI_Elements.push(sizeElement);
  UI_Elements.push(lineSpacingElement);
  UI_Elements.push(lineWrapOption); 
  UI_Elements.push(menuToggleElement);
  

  requestAnimationFrame(mainLoop);

  handleNewHash();
  window.addEventListener('hashchange', handleNewHash, false);
  window.addEventListener('resize', function() {
    setCanvasDim();
    

  }, false);


  function mediaQueryResponse (mq) {

    if (mq.matches) {
    } else {
    }  
  }

  var mq = window.matchMedia('screen and (max-width: 820px)');
  mediaQueryResponse(mq);
  mq.addListener(mediaQueryResponse);
}