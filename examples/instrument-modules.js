'use strict';

const tohu = require('../index');

tohu.setup({
  quiet: false
});

// Definitions of instrumented modules, will likely be in
// separate files somewhere in your application. Keeping in here for simplicity.

// Example of plain class all instances of which
// will have given instrumentation
class Service {
  doAction() {
    return new Promise(
      res => setTimeout(
        () => res({
          priority: Math.floor(Math.random() * 10)
        }),
        Math.floor(Math.random() * 500)
      )
    )
  }
}

// Possible to instrument classes extending orher classes
// Or even built-in constructors
class SortedQueue extends Array {
  priorityComparator(a, b) {
    return a.priority - b.priority;
  }

  push() {
    super.push(...arguments);
    this.sort(this.priorityComparator);

    return this.length;
  }
}

// Possible to instrument function-based protoclasses
function List() {
  this.list = [];
  this.head = null;
  this.tail = null;
}

List.prototype.append = function() {
  this.list.push(...arguments);
  this.sync();
};

List.prototype.sync = function() {
  this.head = this.list[0];
  this.tail = this.list[this.list.length - 1];
};



// Initialization of services somewhere 
// in the application
const service = new Service();
const anotherService = new Service();
const queue = new SortedQueue();
const list = new List();

// Centralized instrumentation configuration
tohu.instrument(
  [{
    // Using class reference as target
    target: Service,
    hooks: [{
      method: 'doAction',
      event: 'service-action'
    }]
  }, {
    // Using class instance as a target
    target: queue,
    hooks: [{
      method: 'push',
      event: 'queue-push'
    }, {
      method: 'sort',
      event: 'queue-sort'
    }]
  }, {
    // Using function-based protoclass as a target
    target: List,
    hooks: [{
      method: 'append',
      event: 'list-append'
    }, {
      method: 'sync',
      event: 'list-sync'
    }]
  }]
);

// Actual code which gets traced
Promise.all(
  new Array(5).fill(0).map(() =>
    Promise.resolve()
      .then(service.doAction)
      .then(result => queue.push(result))
      .then(anotherService.doAction)
      .then(result => list.append(result))
  )
)
  .then(() => tohu.toFile('instrument-modules.json'));