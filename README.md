# obbin
Simple library used to render the user interface

Create global variables
``` js
window.$s = ObbinJS;
```

Initialize the initial value and data
``` js
window.$s.set('objectName', defaultValue, commit?);
```

Data validators when data changes
``` js
window.$s.validators('objectName',[v => v instanceof Array,])
```

Track the variable when the variable's data is changed
``` js
window.$s.watch('objectName', callback(newValue,oldValue), delay=0);
```

ObbinJS accomplishes this by building a virtual DOM to keep track of the changes it needs to make to the real DOM. Taking a closer look at this line:
``` js
return el('p', { children:[context.newValue] })
```
example:
``` js
window.$s.liveDOM('objectName', '#selector', function (context, el) {
    return el('p', {
        attrs: { class: 'mb-0' },
        children: [context.newValue.value]
    })
});
```
