// jsonTag worker
(function(){
  var oCreate = Object.create
  var isArray = Array.isArray;
  var jsonTagObj = {
    prohibitedTag: {},
    inlineTag: {},
    emptyTag: {
      meta: 1,
      link: 1,
      br: 1,
      wbr: 1,
      area: 1,
      img: 1,
      param: 1,
      input: 1,
    },
    reg: {
      tag: /(?:[^\:a-z])/i,
      attr: /^(?:\s*\t*\n*(on))|(:?[^\:a-z])/i,
      jsPro: /(?:javascript:)/i,
    },
    tagEngine: function (tag, property) {
      var reg = this.reg;
      if (reg.tag.test(tag)) { 
        return ['', ''];
      }
      if (this.prohibitedTag[tag]) {
        return ['', ''];
      }
      if (this.inlineTag[tag]) {
        return [this.inlineTag[tag].run(property), ''];
      }
      
      var open = '<' + tag;
      var close = this.emptyTag[tag] ? '' : '</' + tag + '>';
      var pNow;
      for (var i in property) {
        pNow = property[i]+'';
        if (!(reg.attr.test(i.trim())) && !(reg.jsPro.test(pNow))) {
          open += ' ' + i + '="' + pNow.replace('&','&amp;').replace('"', '&quot;') + '"';
        } else {
          return ['',''];
        }
      };
      open += '>';
      return [open, close];
    },
    getTag: function (input) {
      var property;
      
      if (typeof input[0] !== 'string') {
        return ['','',0];
      } 
      
      var nextWork = 2;
      if (input[1]) {
        if ( (isArray(input[1])) || (typeof input[1] === 'string')) {
          nextWork = 1;
        } else {
          property = input[1];
        }
      }
      // main html assembly process
      var tag = input[0];
      var htmlPart = this.tagEngine(tag, property);
      htmlPart[2] = nextWork;
      return htmlPart;
    },
    asyncSet: function(){
      var self = this;
      var arg = arguments;
      setTimeout(function(){
        self.asyncBody.apply(self, arg);
      },0);
    },
    asyncBody: function(json, target, point, complete, error){
      var targetNow = this.getTag(json);
      
      var work = targetNow.pop();
      var closeTag = targetNow.pop();
      var err;
      
      if (work !== 0 && targetNow[0] === '') {
        err = new TypeError('matched with prohibited input pattern');
        err.tag = json[0];
        err.att = (work === 2) ? json[1] : null ;
        error(err);
        return complete();
      }
      
      var count = 0;
      var completeThis = function(){
        count += (-1);
        if (count < 1) {
          targetNow.push(closeTag);
          target[point] = targetNow.join('');
          complete(err);
        }
      };
      
      for (work; work < json.length; work += 1) {
        if (typeof json[work] ==='string') {
          targetNow[work] = json[work].replace('&','&amp;').replace('<','&lt;').replace('>','&gt;');
        } else if (isArray(json[work])) {
          count += 1;
          this.asyncSet(json[work], targetNow, work, completeThis, error);
        } else {
          err = new TypeError('non Array or String input');
          err.input = json[work];
          error(err);
        }
      };
      if (count === 0) {
        completeThis();
      }
    },
    run: function(json, callback){
      var tArr = [''];
      this.asyncSet(json, tArr, 0, 
      function(){
        var result = tArr.shift();
        var error = tArr.length > 0 ? tArr : undefined;
        callback(error, result);
      },
      function(err){
        tArr.push(err);
      });
    },
    runSync: function (json) {
      var targetNow = this.getTag(json);
      var work = targetNow.pop();
      var closeTag = targetNow.pop();
      
      if (work !== 0 && targetNow[0] === '') {
        return '';
      }
      
      for (work; work < json.length; work += 1) {
        if (typeof json[work] ==='string') {
          targetNow.push(json[work].replace('&','&amp;').replace('<','&lt;').replace('>','&gt;'));
        } else if (isArray(json[work])) {
          targetNow.push(this.runSync(json[work]));
        }
      }
      
      targetNow.push(closeTag);
      return targetNow.join('');
    },
    inlineTag: {
      inlineTagWorkProto:{
        template: null,
        procedure: null,
        run: function(input){
          var data = this.template;
          var dataNow;
          for (var k = 0; k < this.procedure.length; k += 1) {
            dataNow = input[this.procedure[k][0]];
            if (dataNow !== undefined) {
              // escape and form check
              dataNow = (dataNow+'').replace('"', '&quot;');
              if (this.procedure[k][3]) {
                if (dataNow.match(this.procedure[k][3])) {
                  dataNow = dataNow;
                } else {
                  return '';
                }
              }
            } else {
              if (this.procedure[k][2]) {
                dataNow = this.procedure[k][2];
              } else {
                return '';
              }
            }
            data = data.replace(this.procedure[k][1], dataNow);
          };
          return data;
        }
      },
      inlineTagFactory: function (source) {
        var inlineTag = oCreate(this.inlineTagWorkProto);
        
        inlineTag.template = source.template;
        inlineTag.procedure = [];
        
        var count = 0;
        for (var i in source.data) {
          inlineTag.procedure[count] = [
            i,
            new RegExp('\\{\\+\\s*'+i+'\\s*\\+\\}'),
            typeof source.data[i] !== 'object' ? source.data[i] : source.data[i].value,
            source.data[i].reg || false,
          ];
          count += 1;
        };
        return inlineTag;
      }
    },
    create: function(opt){
      opt = opt || {};
      
      var jsonTag = oCreate(this);
      
      jsonTag.emptyTag = oCreate(this.emptyTag);
      jsonTag.prohibitedTag = opt.prohibitedTag || oCreate(this.prohibitedTag);
      jsonTag.inlineTag = {};
      
      for (var i in opt.inlineTag) {
        jsonTag.inlineTag[i] = this.inlineTag.inlineTagFactory(opt.inlineTag[i]);
      };
      return jsonTag;
    },
  };
  // worker can post -> obj, arr, str, num, reg
  var jsonTag = jsonTagObj.create();
  
  function workerNext(data){
    // return postMessage( (new Error('test error')).toString());
    
    if (typeof data !== 'object') {
      return;
    }
    
    switch (data.order) {
      case 'set':
        jsonTag = jsonTagObj.create(data.work);
        break;
      case 'html':
        var rObj = {
          asyncCount: data.asyncCount,
          html: jsonTag.runSync(data.work),
        };
        postMessage(rObj);
        break;
    }
	};
	
	onmessage = function (input){
		var data = input.data;
		
		if (typeof data === 'string') {
			data = JSON.parse(data);
		}
    
    workerNext(data);
	};
  
})();