let currentComponentDSIndex;
const collectedStyleData = [];
const IS_COLLECT_MODE = false;
// DEEP EQUAL
// DEEP EQUAL
// DEEP EQUAL
var pSlice = Array.prototype.slice;
var Object_keys = typeof Object.keys === "function"
    ? Object.keys
    : function (obj) {
        var keys = [];
        for (var key in obj)
            keys.push(key);
        return keys;
    };
var deepEqual = function (actual, expected) {
    if (actual === expected) {
        return true;
    }
    else if (actual instanceof Date && expected instanceof Date) {
        return actual.getTime() === expected.getTime();
    }
    else if (typeof actual != "object" && typeof expected != "object") {
        return actual == expected;
    }
    else {
        return objEquiv(actual, expected);
    }
};
function isUndefinedOrNull(value) {
    return value === null || value === undefined;
}
function isArguments(object) {
    return Object.prototype.toString.call(object) == "[object Arguments]";
}
function objEquiv(a, b) {
    if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
        return false;
    if (a.prototype !== b.prototype)
        return false;
    if (isArguments(a)) {
        if (!isArguments(b)) {
            return false;
        }
        a = pSlice.call(a);
        b = pSlice.call(b);
        return deepEqual(a, b);
    }
    try {
        var ka = Object_keys(a), kb = Object_keys(b), key, i;
    }
    catch (e) {
        return false;
    }
    if (ka.length != kb.length) {
        return false;
    }
    ka.sort();
    kb.sort();
    for (i = ka.length - 1; i >= 0; i--) {
        if (ka[i] != kb[i])
            return false;
    }
    for (i = ka.length - 1; i >= 0; i--) {
        key = ka[i];
        let isDeepEqual = deepEqual(a[key], b[key]);
        if (["r", "g", "b"].includes(key)) {
            isDeepEqual = deepEqual(Math.round(a[key] * 255), Math.round(b[key] * 255));
        }
        if (!isDeepEqual) {
            return false;
        }
    }
    return true;
}
// DEEP EQUAL END
// DEEP EQUAL END
// DEEP EQUAL END
// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 600, height: 400 });
// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = (msg) => {
    if (msg.type === "create-rectangles") {
        // do something
    }
    // Make sure to close the plugin when you're done. Otherwise the plugin will
    // keep running, which shows the cancel button at the bottom of the screen.
    figma.closePlugin();
};
function getDSindex(name) {
    const matchResult = name.match(/^([0-9]+\.[0-9]+.*?)\s/);
    return matchResult && matchResult[1];
}
function collectColorStyles(node) {
    if (node.children) {
        node.children.forEach((child) => {
            if (child.type === "INSTANCE" &&
                currentComponentDSIndex &&
                getDSindex(child.name) &&
                getDSindex(child.name) !== currentComponentDSIndex) {
                // a different component inside -- skip
                return;
            }
            collectColorStyles(child);
        });
    }
    if (node.type === "COMPONENT" || "INSTANCE" || "FRAME" || "GROUP") {
        if (node.backgroundStyleId) {
            let objectStyle = figma.getStyleById(node.backgroundStyleId);
            if (objectStyle && objectStyle.key) {
                let style = {
                    name: objectStyle.name,
                    description: objectStyle.description,
                    key: objectStyle.key,
                    type: "PAINT",
                    paints: objectStyle["paints"],
                };
                if (style.name && style.key && style.type) {
                    collectedStyleData.push(style);
                }
                else {
                    figma.notify("Error adding theme");
                    throw new Error("Error adding theme");
                }
            }
        }
    }
    if (node.type === "RECTANGLE" ||
        "POLYGON" ||
        "ELLIPSE" ||
        "STAR" ||
        "TEXT" ||
        "VECTOR" ||
        "BOOLEAN_OPERATION" ||
        "LINE") {
        if (node.fillStyleId) {
            let objectStyle = figma.getStyleById(node.fillStyleId);
            if (objectStyle && objectStyle.key) {
                // if (objectStyle.name.includes("D1")) {
                //   console.log(">>>", node.name);
                // }
                let style = {
                    name: objectStyle.name,
                    description: objectStyle.description,
                    key: objectStyle.key,
                    type: "PAINT",
                    paints: objectStyle["paints"],
                };
                if (style.name && style.key && style.type) {
                    collectedStyleData.push(style);
                }
                else {
                    figma.notify("Error adding theme");
                    throw new Error("Error adding theme");
                }
            }
        }
        if (node.strokeStyleId) {
            let objectStyle = figma.getStyleById(node.strokeStyleId);
            if (objectStyle && objectStyle.key) {
                let style = {
                    name: objectStyle.name,
                    description: objectStyle.description,
                    key: objectStyle.key,
                    type: "PAINT",
                    paints: objectStyle["paints"],
                };
                if (style.name && style.key && style.type) {
                    collectedStyleData.push(style);
                }
                else {
                    figma.notify("Error adding theme");
                    return;
                }
            }
        }
    }
}
function collectTextStyles(node) {
    // check for children on note, if they exist, run them through this function
    // this will help us walk the tree to the bottom most level
    if (node.children) {
        node.children.forEach((child) => {
            collectTextStyles(child);
        });
    }
    if (node.type === "TEXT" &&
        node.textStyleId != "MIXED" &&
        node.textStyleId &&
        typeof node.textStyleId === "string") {
        let objectStyle = figma.getStyleById(node.textStyleId);
        // key will only be available for remote styles
        if (objectStyle && objectStyle.key) {
            let style = {
                name: objectStyle.name,
                description: objectStyle.description,
                key: objectStyle.key,
                type: "TEXT",
            };
            if (style.name && style.key && style.type) {
                collectedStyleData.push(style);
            }
            else {
                figma.notify("Error adding theme");
                throw new Error("Error adding theme");
            }
        }
    }
}
// grab effect styles
function collectEffectStyles(node) {
    if (node.children) {
        node.children.forEach((child) => {
            collectEffectStyles(child);
        });
    }
    if (node.effectStyleId) {
        let objectStyle = figma.getStyleById(node.effectStyleId);
        // key will only be available for remote styles
        if (objectStyle && objectStyle.key) {
            let style = {
                name: objectStyle.name,
                description: objectStyle.description,
                key: objectStyle.key,
                type: "TEXT",
            };
            if (style.name && style.key && style.type) {
                collectedStyleData.push(style);
            }
            else {
                figma.notify("Error adding theme");
                throw new Error("Error adding theme");
            }
        }
    }
}
const getStyleNameWithoutTheme = (name) => {
    const nameParts = name.split("/");
    return nameParts.pop();
};
const toCSSCase = (name) => name.toLowerCase().replace(/(\s|\/)/g, "-");
const selection = figma.currentPage.selection[0];
console.log({ selection });
function supportsChildren(node) {
    console.log("...", node.type);
    return (node.type === "FRAME" ||
        node.type === "GROUP" ||
        node.type === "COMPONENT" ||
        node.type === "COMPONENT_SET" ||
        node.type === "INSTANCE" ||
        node.type === "BOOLEAN_OPERATION");
}
if (supportsChildren(selection)) {
    selection.children.forEach((child) => {
        console.log(child.name);
    });
}
