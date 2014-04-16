# jsRouter

URL driven web application framework

# Introduction

jsRouter is url driven rich client application framework. 
the jsRouter work small code and simple structure. 
not only small size of framework but also framework has no dependency to other library.

# json routing table

url of anchor tag in page will parsing and routing by router. 
jsRouter use simple json routing table for routing application. 
router has only few regulation. 
first, '$' is reserved name in a routing table.
'$' will using for application object in a routing table. 
second, the other object names what can come from url data will using to structure of router.

```
  /*
    below table object has space for these url.
    '/'
    '/hello'
    '/hello/world'
    '/hello/hi'
  */
  var table = {
    hello: {
      world: {
        
      },
      hi: {
        
      }
    }
  };
```

# application object

a application object is object of functions and template data for each url. 
application object can handling three callback functions and one template data and few parameters. 
name of each callback function are app and callback and depart. 
state of app function calling is before template stage. 
and, state of callback function calling is after template stage. 
finally, stage of depart function calling is before the other anchor event.
all of callback function can omit, if you don't need it.

```
  /*
    app and depart function take next callback functions for async work.
  */
  var appObj = {
    app: function(next, url){
      console.log('first, app')
      
      next()
    },
    callback: function(){
      console.log('next, callback')
    },
    depart: function(next){
      console.log('finally, depart')
      
      next()
    }
  };
```

## json html

  application object could including template data that json html. 
  json html is json write method of html. 
  so, you don't need hard learn for it, if you know about html.

  ```
  html
  <div>
    <a href = "/"> home </a>
    <br>
    <span id = "spanId"> hello </span>
  </div>


  json html
  ['div',
    ['a', {href:'/'}, 'home'],
    ['br'],
    ['span', {id:'spanId'}, 'hello']
  ]
  ```

# application example

```
<!DOCTYPE HTML>
<html>
  <head>
    <meta charset="UTF-8">
    
    <script type="text/javascript" src="/jsRouter.js"></script>
    
    <script type="text/javascript">
      var appObj = {
        app: function(next, url){
          console.log('app first')
          
          next()
        },
        
        html: ['div',
          ['a', {href:'/'}, 'home'],
          ['br'],
          ['a', {href:'/hello'}, 'hello'],
          ['br'],
          ['a', {href:'/hello/world'}, 'hello,world'],
          ['br'],
          ['a', {href:'/hello/hi'}, 'hello,hi'],
          ['br'],
          ['span', {id:'spanId'}, 'test text']
        ],
        
        callback: function(){
          console.log('next callback')
        },
        depart: function(next){
          console.log('finally, depart')
          
          next()
        }
      };

      var appObjFactory = function(title){
        var obj = Object.create(appObj);
        
        obj.title = title;
        
        return obj;
      };

      var table = {
        $: appObjFactory('home'),
        
        hello: {
          $: appObjFactory('hello'),
          
          world: {
            $: appObjFactory('world'),
          },
          
          hi: {
            $: appObjFactory('hi'),
          }
        }
      };

      var jsRouterObj = jsRouter( true /* debug message */ );
      var jr = jsRouterObj.create({
        mainSelector: '#main',
        table: table,
      });
      document.addEventListener('DOMContentLoaded', function(){
        jr.start();
      });
      
    </script>
  </head>
  <body>
    <div id = "main">
    </div>
  </body>
</html>
```


# License
MIT License