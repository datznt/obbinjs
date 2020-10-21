const ObbinJS = function () {
    this._values = {};
    const that = this;
    this.watch = function (key, callback, timeout = 0) {
        const v = this.find(key);
        if (!!v) v.events.push({
            callback: callback,
            timeout: timeout, instance: null
        });
        else throw `${key} realy define`;
    };
    this.validators = function (key, validators = []) {
        const v = this.find(key);
        if (!!v) v.validators = validators;
        else throw `${key} realy define`;
    };
    this.set = function (key, value, commit = true) {
        const v = this.find(key);
        if (!!v) {
            let valid = this._validators.run(value, v.validators);
            if (!valid) {
                throw 'value is not validate';
            } else {
                const oldValue = v.value;
                v.value = value;
                if (commit) this._events.call(v.events, v.value, oldValue);
            }
        }
        else {
            const newValue = this._format.getValueFormat();
            newValue.value = value;
            this._values[key] = newValue;
        }
    };
    this.get = function (key) {
        const v = this.find(key);
        return !!v ? v.value : null;
    },
        this.find = function (key) {
            const keys = Object.keys(this._values);
            if (keys.includes(key)) return this._values[key];
            return null;
        };
    this.live = function (key, selector, render) {
        const v = this.find(key);
        if (!!v) {
            this.watch(key, function (data, old) {
                var elements = [];
                const html = render(data, old);
                const hasLocker = that._locker.hasLocker(selector);

                if (hasLocker) {
                    elements = that._query.withLocker(
                        that._locker.getLocker(selector)
                    );
                } else {
                    elements = that._query.withSelector(selector);
                }

                const virtual = that._render.parseHTML2DOM(html);
                that._locker.lockElement(selector, virtual);
                [].forEach.call(elements, function (el) {
                    if (el != null) el.replaceWith(virtual);
                })
            });
        }
        else throw `${key} realy define`;
    };
    this.liveDOM = function (key, selector, render) {
        const v = this.find(key);
        if (!!v) {
            this.watch(key, function (data, old) {
                // get virtual object
                const context = { newValue: data, oldValue: old };
                const virtual = render(context, that._render.createElement);
                // render virtual dom element
                const virtualDom = that._render.render(virtual);

                if (that._locker.hasLocker(selector)) {
                    var locker = that._locker.getLocker(selector);
                    var el = that._query.withLocker(locker);

                    const patch = that._render.diff(locker.virtual, virtual);
                    locker.dom = patch(el);
                    locker.virtual = virtual;
                } else {
                    var locker = that._locker.lockElement(selector, virtual, virtualDom);
                    var el = that._query.withSelector(selector);

                    // insert to dom
                    that._render.insertElement(virtualDom, el);
                }
            });
        }
        else throw `${key} realy define`;
    };
    this.bind = function (key, selector, mapValue, trigger = 'change', delay = 0) {
        const v = this.find(key);
        if (!!v) {
            const elements = this._query.withSelectorAll(selector);
            const self = this;
            elements.forEach(function (el) {
                if (el instanceof HTMLInputElement
                    || el instanceof HTMLSelectElement) {

                    el.addEventListener(trigger, function (evt) {
                        self.set(key, evt.target.value)
                    });

                    self.watch(key, function (obj, old) {
                        if (!!mapValue) el.value = mapValue(obj);
                        else el.value = obj;
                    }, delay);
                }
            });
        }
        else throw `${key} realy define`;
    };
    this._format = {
        getValueFormat: function () {
            return { value: null, events: [], validators: [], timeout: null }
        },
        getLockerFormat: function () {
            return { key: null, virtual: null, dom: null }
        }
    };
    this._events = {
        call: function (events, value, oldValue) {
            for (let index = 0; index < events.length; index++) {
                let e = events[index];
                if (e.timeout == 0) e.callback(value, oldValue);
                else {
                    clearTimeout(e.instance);
                    e.instance = setTimeout(function () {
                        e.callback(value, oldValue);
                    }, e.timeout);
                }
            }
        },
    };
    this._locker = {
        _lockers: {},
        _increment: 1,
        lockElement: function (selector, virtual, dom) {
            var looker = that._format.getLockerFormat();

            if (!this.hasLocker(selector)) {
                looker.key = this.incrementId();
                this._lockers[selector] = looker;
            } else {
                looker = this.getLocker(selector);
            }

            looker.dom = dom;
            looker.virtual = virtual;

            dom.dataset.sid = looker.key;
            return looker
        },
        getLocker: function (selector) {
            return this._lockers[selector] || null
        },
        hasLocker: function (selector) {
            var looker = this.getLocker(selector);
            return !(typeof looker === 'undefined' || looker == null)
        },
        incrementId: function () {
            this._increment++;
            return 'sid-' + this._increment;
        },
    };
    this._render = {
        _textnodes: ['bigint', 'string', 'number',
            'undefined', 'boolean'],
        parseHTML2DOM: function (html) {
            const dom = new DOMParser().parseFromString(html, 'text/html');
            if (dom.body.children.length > 1) {
                throw 'html template need wrapper element';
            }
            return dom.body.children[0];
        },
        createElement: function (tagName, { attrs = {}, children = [] } = {}) {
            return { tagName, attrs, children }
        },
        render: function ({ tagName, attrs = {}, children = [] }) {
            let element = document.createElement(tagName);
            // insert all children elements
            children.forEach(child => {
                if (this._textnodes.includes(typeof child)) {
                    // if the children is a kind of string create a text Node object
                    element.appendChild(document.createTextNode(child));
                }
                else {
                    // repeat the process with the children elements
                    element.appendChild(this.render(child));
                }
            });
            // if it has attributes it adds them to the element
            if (Object.keys(attrs).length) {
                for (const [key, value] of Object.entries(attrs)) {
                    element.setAttribute(key, this.preAttr(key, value));
                }
            }
            return element;
        },
        insertElement: function (element, domElement) {
            domElement.replaceWith(element);
            return element;
        },
        zip: function (xs, ys) {
            const zipped = [];
            for (let i = 0; i < Math.max(xs.length, ys.length); i++) {
                zipped.push([xs[i], ys[i]]);
            }
            return zipped;
        },
        diffAttrs: function (oldAttrs, newAttrs) {
            const patches = [];
            // set new attributes
            for (const [k, v] of Object.entries(newAttrs)) {
                patches.push($node => {
                    $node.setAttribute(k, this.preAttr(k, v));
                    return $node;
                });
            }
            // remove old attributes
            for (const k in oldAttrs) {
                if (!(k in newAttrs)) {
                    patches.push($node => {
                        $node.removeAttribute(k);
                        return $node;
                    });
                }
            }
            return $node => {
                for (const patch of patches) {
                    patch($node);
                }
            };
        },
        diffChildren: function (oldVChildren, newVChildren) {
            const childPatches = [];
            oldVChildren.forEach((oldVChild, i) => {
                childPatches.push(this.diff(oldVChild, newVChildren[i]));
            });

            const additionalPatches = [];
            for (const additionalVChild of newVChildren.slice(oldVChildren.length)) {
                additionalPatches.push($node => {
                    $node.appendChild(this.render(additionalVChild));
                    return $node;
                });
            }

            return $parent => {
                for (const [patch, child] of this.zip(childPatches, $parent.childNodes)) {
                    patch(child);
                }

                for (const patch of additionalPatches) {
                    patch($parent);
                }

                return $parent;
            };
        },
        diff: function (vOldNode, vNewNode) {
            if (vNewNode === undefined) {
                return $node => {
                    $node.remove();
                    return undefined;
                };
            }

            if (this._textnodes.includes(typeof vOldNode)
                || this._textnodes.includes(typeof vNewNode)) {
                if (vOldNode !== vNewNode) {
                    return $node => {
                        const $newNode = this.render(vNewNode);
                        $node.replaceWith($newNode);
                        return $newNode;
                    };
                } else {
                    return $node => undefined;
                }
            }

            if (vOldNode.tagName !== vNewNode.tagName) {
                return $node => {
                    const $newNode = this.render(vNewNode);
                    $node.replaceWith($newNode);
                    return $newNode;
                };
            }
            const patchAttrs = this.diffAttrs(vOldNode.attrs, vNewNode.attrs);
            const patchChildren = this.diffChildren(vOldNode.children, vNewNode.children);

            return $node => {
                patchAttrs($node);
                patchChildren($node);
                return $node;
            };
        },
        preAttr(key, value) {
            if (key === 'class' && !!value && value instanceof Array) {
                return value.join(' ');
            }
            return value;
        }
    };
    this._query = {
        withLocker: function (locker) {
            return document.querySelector(`[data-sid="${locker.key}"]`)
        },
        withSelector: function (selector) {
            return document.querySelector(selector);
        },
        withSelectorAll: function (selector) {
            return document.querySelectorAll(selector);
        },
    };
    this._validators = {
        run: function (value, validators = []) {
            const checker = []
            for (let index = 0; index < validators.length; index++) {
                let v = validators[index];
                checker.push(v(value));
            }
            return checker.every(function (valid) {
                return valid === true;
            })
        },
    }
};
export default ObbinJS;