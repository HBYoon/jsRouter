// 2013 - 2014 HBYoon

// jsRouter / just simple router and template for a single page app
// 0.0.1

// IE9+, FF4+, CH7+, OP12+

// api for full function working

// DOM2 event model
// window.history

/*
type next()::<function> | next(arg)::<function> -> function for async next work request
var data = {
  $:{
    // page title
    title: <string>,
    
    // target css selector of html
    selector: cssSelector::<string>
    
    // if this is true, this page data ignore currentState.
    forced: <bool>,
    
    // if this is true, url string of after this point will be pass to app function.
    parse: <bool>,
    
    // app function will run before html template.
    app: app(next(arg),uriData)::<function>,
    
    // jsonTag array
    html: jsonTag::<array>,
    
    // callback function will run after html inserted.
    // arg is arguments of the app next function.
    callback: cb(arg1, arg2, ...)::<function>,
    
    // depart function will run before appAnchor link.
    // callback function next() is trigger of state update work.
    depart: depart(next())::<function>,
  }
};
*/

var jsRouter = function jsRouter (debug) {
	// check!
	var win = window;
	var doc = win.document;
  
	// win.jsRouterReady = 1;
	// if (!doc.querySelectorAll) {
		// win.jsRouterReady = 0;
		// return {};
	// }
	var isArray = Array.isArray;
  
  var oCreate = Object.create;
  
  // event design is from by the node.js, but skipped a lot of things
  // update 140129 - emit work LIFO
  var eventMethod = {
    on: function(type, fun){
      if (typeof fun !== 'function') {
        this.emit('error', new TypeError('event listener must be a function'));
      }
      var ev = this._ev || (this._ev = {});
      (ev[type]||(ev[type]=[])).push(fun);
      return this;
    },
    once: function(type, fun){
      if (typeof fun !== 'function') {
        this.emit('error', new TypeError('event listener must be a function'));
      }
      var evo = this._evOnce || (this._evOnce = {});
      (evo[type]||(evo[type]=[])).push(fun);
      return this;
    },
    remove: function(type, fun){
      this._ev[type] = this._removeFrom(this._ev[type], fun);
      this._evOnce[type] = this._removeFrom(this._evOnce[type], fun);
    },
    removeAll: function(type){
      this._ev = {};
      this._evOnce = {};
    },
    emit: function(type){
      var result = false;
      var argNow = arguments;
      var arg;
      
      switch (argNow.length) {
        case 1: 
          break;
        case 2: arg = [argNow[1]]; 
          break;
        case 3: arg = [argNow[1], argNow[2]]; 
          break;
        default:
          // argNow[0] is type of event
          arg = [];
          for (var i = 1; i < argNow.length; i += 1) {
            arg[i-1] = argNow[i];
          };
      };
      
      result = (this._emitThis(type, arg)) || result;
      result = (this._emitOnceThis(type, arg)) || result;
      
      if (this.mod === 0) {
        // mod: private
        return result;
      } else if (this.mod === 1) {
        // mod: top level
        result = (this.top._emitThis(type, arg)) || result;
        result = (this.top._emitOnceThis(type, arg)) || result;
      } else if (this[this.mod]) {
        // mod: custom upper level
        result = (this[this.mod]._emitThis(type, arg)) || result;
        result = (this[this.mod]._emitOnceThis(type, arg)) || result;
      }
      return result;
    },
    _removeFrom: function(evt, fun){
      if (!evt || !fun){ return; }
      var len = evt.length;
      while (len) {
        len += (-1);
        if (evt[len] === fun) {
          evt.splice(len, 1);
        }
      };
      return evt;
    },
    _emitThis: function(type, arg){
      if (!this._ev || !this._ev[type]) { return false; }
      var target = this._ev[type];
      switch (target.length) {
        case 4: target[3].apply(this, arg);
        case 3: target[2].apply(this, arg);
        case 2: target[1].apply(this, arg);
        case 1: target[0].apply(this, arg);
        case 0: ;
          break;
        default:
          var len = target.length;
          while(len){
            len += (-1);
            target[len].apply(this, arg);
          }
      };
      return true;
    },
    _emitOnceThis: function(type, arg){
      if (!this._evOnce || !this._evOnce[type]) { return false; }
      var target = this._evOnce[type];
      while (target[0]) {
        (target.pop()).apply(this, arg);
      };
      return true;
    }
  };
  
  // prototype of upper level event layer, defualt is top level event
  var upperEventObj = {
    _ev:null,
    _evOnce:null,
    on: eventMethod.on,
    once: eventMethod.once,
    remove: eventMethod.remove,
    removeAll: eventMethod.removeAll,
    _removeFrom: eventMethod._removeFrom,
    _emitThis: eventMethod._emitThis,
    _emitOnceThis: eventMethod._emitOnceThis,
    create: function(){
      var newTop = oCreate(this);
      newTop._ev = {};
      newTop._evOnce = {};
      return newTop;
    }
  };
  
  var eventObj = {
    top: upperEventObj.create(),
    _ev:{},
    _evOnce:{},
    mod: 1,
    on: eventMethod.on,
    once: eventMethod.once,
    emit: eventMethod.emit,
    remove: eventMethod.remove,
    removeAll: eventMethod.removeAll,
    _removeFrom: eventMethod._removeFrom,
    _emitThis: eventMethod._emitThis,
    _emitOnceThis: eventMethod._emitOnceThis,
    create: function(mod){
      var newEv = oCreate(this);
      
      newEv._ev = {};
      newEv._evOnce = {};
      
      if (!mod) {
        return newEv;
      }
      
      switch (mod) {
        case 'private':
          newEv.top = null;
          newEv.mod = 0;
          break;
        case 'top': 
          newEv.top = eventObj.top;
          newEv.mod = 1;
          break;
        default:
          newEv.mod = mod;
          newEv[mod] = upperEventObj.create();
      };
      return newEv;
    }
  };
  
  // async non-block template
  var jsonTagObj = {
    prohibitedTag: {},
    inlineTag: {},
    toSyncTime: 50,
    emptyTag: {
      meta: 1,
      link: 1,
      br: 1,
      wbr: 1,
      area: 1,
      img: 1,
      param: 1,
      input: 1
    },
    reg: {
      tag: /(?:[^\:a-z])/i,
      attr: /^(?:\s*\t*\n*(on))|(:?[^\:a-z])/i,
      jsPro: /(?:javascript:)/i
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
    nextAsync: function(json, target, point, control, complete, error){
      var self = this;
      var arg = arguments;
      setTimeout(function(){
        if (control[0]) {
          return self.asyncBody.apply(self,arg);
        }
        target[point] = self.runSync(json, error);
        complete();
      });
    },
    asyncBody: function(json, target, point, control, complete, error){
      var self = this;
      var targetNow = self.getTag(json);
      
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
          this.nextAsync(json[work], targetNow, work, control, completeThis, error);
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
    setControl: function(){
      var control = [true];
      setTimeout(function(){
        control[0] = false;
      },this.toSyncTime);
      return control;
    },
    run: function(json, callback){
      var self = this;
      var tArr = [''];
      
      // async to sync switch control
      var control = this.setControl();
      
      this.nextAsync(json, tArr, 0, control,
      function(){
        var result = tArr.shift();
        var error = tArr.length > 0 ? tArr : undefined;
        callback(error, result);
      },
      function(err){
        tArr.push(err);
      });
      
    },
    runSync: function (json, error) {
      var targetNow = this.getTag(json);
      var work = targetNow.pop();
      var closeTag = targetNow.pop();
      var err;
      
      if (work !== 0 && targetNow[0] === '') {
        if (error) {
          err = new TypeError('matched with prohibited input pattern');
          err.tag = json[0];
          err.att = (work === 2) ? json[1] : null ;
          error(err);
        }
        return '';
      }
      
      for (work; work < json.length; work += 1) {
        if (typeof json[work] ==='string') {
          targetNow.push(json[work].replace('&','&amp;').replace('<','&lt;').replace('>','&gt;'));
        } else if (isArray(json[work])) {
          targetNow.push(this.runSync(json[work]));
        } else if (error) {
          err = new TypeError('non Array or String input');
          err.input = json[work];
          error(err);
        }
      }
      
      targetNow.push(closeTag);
      return targetNow.join('');
    },
    inlineTag: {
      inlineTagWorkProto:{
        template: null,
        procedure: null,
        runDataNow: function(dataNow, procNow){
          if (dataNow !== undefined) {
            // escape and form check
            dataNow = (dataNow+'').replace('"', '&quot;');
            if (this.procedure[procNow][3]) {
              if (dataNow.match(this.procedure[procNow][3])) {
                dataNow = dataNow;
              } else {
                dataNow = false;
              }
            }
          } else {
            if (this.procedure[procNow][2]) {
              dataNow = this.procedure[procNow][2];
            } else {
              dataNow = false;
            }
          }
          return dataNow;
        },
        run: function(input){
          input = input || {};
          var data = this.template;
          var dataNow;
          for (var k = 0; k < this.procedure.length; k += 1) {
            dataNow = this.runDataNow(input[this.procedure[k][0]], k);
            if (dataNow === false) {
              return '';
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
      
      jsonTag.toSyncTime = opt.toSyncTime || 60;
      jsonTag.emptyTag = oCreate(this.emptyTag);
      jsonTag.prohibitedTag = opt.prohibitedTag || oCreate(this.prohibitedTag);
      jsonTag.inlineTag = {};
      
      for (var i in opt.inlineTag) {
        jsonTag.inlineTag[i] = this.inlineTag.inlineTagFactory(opt.inlineTag[i]);
      };
      return jsonTag;
    }
  };
  
  // /* worker test
  var asyncWorkerCallbackStore = {
    // callback store
    cbs: [],
    // timeout store
    tos: [],
    // count
    c: 0,
    // count max
    cMax: 65535,
    timeout: 3000,
    countUp: function(){
      if (this.c === this.cMax) {
        this.c = 0;
      } else {
        this.c += 1;
      }
    },
    set: function(fun){
      var self = this;
      var c = self.c;
      
      // even overflow, request of awcs set will be never fail
      if (self.cbs[c]) {
        clearTimeout(self.tos[c]);
        self.cbs[c](new Error('async count overflow error'));
      }
      
      self.cbs[c] = fun;
      self.tos[c] = setTimeout(function(){
        delete self.cbs[c];
        fun(new Error('async timeout error'));
      }, self.timeout);
      
      self.countUp();
      
      return c;
    },
    get: function(c){
      var fun = this.cbs[c];
      delete this.cbs[c];
      clearTimeout(this.tos[c]);
      return fun;
    }
  };
  
  var workerEvCallbackFactory = function(self){
    return {
      message: function(result){
        var data = result.data;
        var cb = self._awcs.get(data.asyncCount);
        if (!cb) {
          return;
        }
        cb(null, data.html);
      },
        
      error: function(err){
        self.on = false;
        self._w.terminate();
        
        eventObj.emit('error', err);
      }
    };
  };
  
  var workerObj = {
    _awcs: asyncWorkerCallbackStore,
    
    // slot for Worker
    _w: null,
    
    on: true,
    
    html: function(json, callback) {
      var req = {
        order: 'html',
        asyncCount: this._awcs.set(callback),
        work: json,
      };
      this._w.postMessage(req);
    },
    create: function(opt){
      var worker = Worker ? new Worker(opt.path) : false;
      
      if (!worker) {
        return false;
      }
      
      var wObj = oCreate(this);
      var evCallback = workerEvCallbackFactory(wObj);
      
      wObj._w = worker;
      wObj._w.postMessage({order:'set', work:opt.jsonTag});
      
      wObj._w.addEventListener('message', evCallback.message);
      wObj._w.addEventListener('error', evCallback.error); 
      
      return wObj;
    }
  }; 
  // */
  
  
  var dummyFactory = function(title){
    return {
      $: {
        title: title,
      }
    };
  };
  
  var setFatalErrorHandling = function(jr){
    jr.table.error.fatal = jr.table.error.fatal || (dummyFactory('fatal'));
    jr.top.on('error',function(err){
      if (err.fatal) {
        jr.run(jr.table.error.fatal.$);
      }
    });
  };
  
  
  var jsRouter = eventObj.create();
  
  // if debug is true, all of error event will be print
  if (debug) {
    jsRouter.top.on('error', function(err){
      console.log('<debug>');
      console.error(err);
    });
  }
  
  jsRouter.table = null;
  jsRouter.state = null;
  jsRouter.history = false;
  jsRouter.worker = false;
  
  jsRouter.host = win.location.hostname;
  jsRouter.stateTarget = 'body';
  
  jsRouter.jsonTag = jsonTagObj.create();
  
  jsRouter.pathReg = /^\//;
  
  jsRouter.util = {
    event: eventObj,
    jsonTag: jsonTagObj,
    htmlIn: function(html, node, tag, top) {
      if (!tag) {
        return node.innerHTML = html;
      }
      var newNode = doc.createElement(tag);
      newNode.innerHTML = html;
      if (top) {
        return node.insertBefore(newNode, node.childNodes[0]);
      }
      return node.appendChild(newNode);
    }
  };
  
  jsRouter.htmlWork = function(jrData, callback){
    var node = doc.querySelectorAll(jrData.selector);
    var length = node.length;
    var self = this;
    var err;
    var innerCB = function(e, result){
      if (e) {
        self.emit('error', e);
      }
      if (self.state.currentState !== jrData && !jrData.forced) {
        return callback(new Error ('htmlWork old state request error'));
      }
      
      if (length === 1) {
        self.util.htmlIn(result, node[0])
      } else {
        while(length){
          length += (-1);
          self.util.htmlIn(result, node[length]);
        };
      }
      return callback(undefined);
    };
    
    if (length === 0) { 
      err = new Error('selected node element error, Null element');
      err.fatal = true;
      callback(err);
      self.emit('error', err);
      return;
    }
    
    if (self.worker && self.worker.on) {
      return self.worker.html(jrData.html, innerCB);
    }
    
    self.jsonTag.run(jrData.html, innerCB);
  };
  
  /*
  131214
  runToState update
  state.$.fix = true -> skip history update, for single page work
  140129
  state.$.depart = <function> -> run depart function before state update
  */
  jsRouter.runToState = function(targetPath, replaceState){
    var self = this;
    
    var path = targetPath.replace(self.pathReg, '').split('/');
    var state = self.table;
    console.log(path);
    if (path.length === 1 && path[0] === ''){
      path.length = 0;
    }
    
    while (path[0] !== undefined) {
      state = state[path.shift()];
      if (state) {
        if (state.$ && state.$.parse) {
          break;
        }
      } else {
        break;
      }
    };
    
    if (!(state && state.$)) {
      self.emit('error',new Error('cannot find path: ' + targetPath));
      return self.run(self.table.error['404'].$);
    }
    
    if (!state.$.fix && self.history) {
      if (replaceState) {
        win.history.replaceState(targetPath, null, targetPath);
      } else {
        win.history.pushState(targetPath, null, targetPath);
      }
    }
    
    if (!self.state.currentState.depart) {
      return self.run(state.$, path, targetPath);
    }
    self.state.currentState.depart(function(){
      return self.run(state.$, path, targetPath);
    });
  };
  
  
  
  jsRouter.run = function(jrData, parseData, target){
    var self = this;
    var argOfNext;
    
    var underCB = function(err) {
      self.onAnchor(jrData);
      
      if (!err && jrData.callback) {
        jrData.callback.apply(jrData, argOfNext);
      }
      
      self.emit('state', target);
    };
    
    var next = function() {
      argOfNext = arguments;
      if (self.state.currentState !== jrData && !jrData.forced) {
        return;
      }
      
      if (jrData.title) {
        doc.title = jrData.title;
      }
      
      if (jrData.html) {
        return self.htmlWork(jrData, underCB);
      }
      underCB();
    };
    
    if (!jrData.forced) {
      self.state.currentState = jrData;
    }
    
    jrData.selector = jrData.selector || self.mainSelector;
    
    if (jrData.app) {
      jrData.app.call(jrData, next, parseData);
    } else {
      next()
    }
    
    
  };
  
  jsRouter.onAnchor = function(jrData){
    if (jrData.noAnchor) {
      return;
    }
    var select = jrData.selector;
    var node = doc.querySelectorAll(select + ' '+ this.appAnchor);
    var len = node.length;
    while(len) {
      len += (-1);
      (node[len]).addEventListener('click', this.state.moveEvent, false);
    };
  };
  
  jsRouter._moveEventFactory = function(self, opt){
    
    // all of move request will processed by input order.
    
    self.moveRequestQueue = [];
    var requestSet = function(event){
      if (self.state.block) {
        return;
      }
      var target = event.currentTarget.pathname;
      self.moveRequestQueue.push(target);
      if (self.moveRequestQueue.length === 1) {
        self.runToState(target);
      }
    };
    
    self.on('state', function(target){
      self.moveRequestQueue.shift();
      if (!self.moveRequestQueue.length) {
        return;
      }
      self.runToState(self.moveRequestQueue[0]);
    });
    
    return function(event){
      if (event.currentTarget.hostname !== self.host) {
        return true;
      }
      requestSet(event);
      return event.preventDefault();
    };
  };
  
  jsRouter.moveRequestRemove = function(){
    this.moveRequestQueue.length = 0;
  };
  
  jsRouter.start = function(){
    var self = this;
    var startState = win.location.pathname;
    if (self.history){
      win.onpopstate = function mainPop(event){
        if (event.state) {
          return self.runToState(event.state, true);
        }
      };
    }
    self.runToState(startState, true);
  };
  
  jsRouter.create = function(opt){
    var jr = oCreate(this);
    var jsonTagOption = {
      toSyncTime:    opt.toSyncTime,
      prohibitedTag: opt.prohibitedTag || {},
      inlineTag:     opt.inlineTag || {},
    };
    
    jr._ev = {};
    jr._evOnce = {};
    
    jr.mainSelector = opt.mainSelector || 'body';
    jr.appAnchor = opt.appAnchor || 'a';
    
    jr.table = opt.table || {};
    
    jr.table.error = jr.table.error || {};
    jr.table.error['404'] = jr.table.error['404'] || (dummyFactory('404'));
    
    jr.jsonTag = jr.util.jsonTag.create(jsonTagOption);
    
    jr.state = {
      currentState: {},
      moveEvent: jr._moveEventFactory(jr, opt),
    };
    
    if (opt.worker) {
      jr.worker = workerObj.create({
        path:opt.worker,
        jsonTag: jsonTagOption,
      });
    }
    
    if (opt.fatalErrorCut) {
      setFatalErrorHandling(jr);
    }
    
    if (win.history && win.history.pushState) {
      jr.history = true;
    }
    
    return jr;
  };
  
  return jsRouter;
};