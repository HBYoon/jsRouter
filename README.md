# jsRouter

link driven web application framework

# Example

```
<!DOCTYPE HTML>
<html>
  <head>
    <meta charset="UTF-8">
    
    <script type="text/javascript" src="/jsRouter.js"></script>
    
    <script type="text/javascript">
      var hello = {
        $: {
          title: 'hello!',
          html: [
            ['div', 'hello!'],
            ['br'],
            ['a',{href:'/world'},'to world!']
          ]
        },
        world: {
          $: {
            title: 'world!',
            html: [
              ['div', 'world!'],
              ['br'],
              ['a',{href:'/'},'to hello!']
            ]
          }
        }
      };
      
      var jsRouterObj = jsRouter(true);
      var jr = jsRouterObj.create({
        mainSelector: '#main',
        data: hello,
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