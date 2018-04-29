![TOHU](assets/logo.png?raw=true "TOHU")
--------
|Code|    |Trace|
|:----:|:----:|:----:|
|![before](assets/code.png?raw=true "Code")|=>|![after](assets/trace.png?raw=true "Trace")|

Some information is just not suitable to be presented as logs and requires different visualisation. Good example are http calls performed by a server during processing of incoming request or events in a distributed system coming in undetermenistic order and duration.
Tohu can help transforming such information into format compatible with Chrome's about://tracing, which is awesome frontend for any traces and available almost everywhere alongside with Chrome.

#### Quickstart
- Install tohu
```bash
npm i tohu --save
```

- Include it in your sources
```javascript
const tohu = require('tohu');

// one eternity later
tohu.toFile('trace.json');
```

- View results with chrome tracing frontend
  - Open chrome://tracing in Google Chrome
  - Click "Load" at top left corner
  - Select trace file stored by tohu

#### Config
Tohu supports following configuration options with `tohu.setup()` call:
```javascript
{
  // Enable/disable internal logging of
  // additional debug infor
  quiet: true,
  
  // When true, tohu will store request/response pair bodies 
  // for further analysis. Significantly increases trace file size.
  storeBody: false,
  
  // Allows to specify transport for loggins, transport should suppoort 
  // three levels as methods: debug, info, error
  log: console,
  
  // Defines output format of trace file. Defaults to Chrome's about://tracing
  format: 'chrome-tracing',
  
  // Filename to use for storing trace. Will be stored
  // inside the same directory from which node.js programm was launched
  file: 'tohu.json'
}
```
