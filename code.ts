let selection: SceneNode = null;
let generatedSpecIds = {};

let theme = "dark";
let specSheetShift = 0;

const themeColors = {
  dark: {
    BACKGROUND_PRIMARY: "ab6827d4e2d7c06ab4dae4b1876bdb139fa85100",
    BACKGROUND_SECONDARY: "0bd8b8de81f606f927efe9b3228925f5ffbdba98",
    TYPOGRAPHY_PRIMARY: "fe3bfda22784624ebc72547c3e526d0e1ca315cb",
    TYPOGRAPHY_TERTIARY: "fd656735b86b49267988cc53ad10827d9a47b7bb",
  },
  light: {
    BACKGROUND_PRIMARY: "7e82cefd2a139615513b5cb9899663a2f26a4e7c",
    BACKGROUND_SECONDARY: "b2072b5c73acff740cb6b392df7f5d360d733d7b",
    TYPOGRAPHY_PRIMARY: "af57bb2d5eed62a3aa8c01282b23dd814de8c3d0",
    TYPOGRAPHY_TERTIARY: "4c7db22717863ce7c68189d75ba54f18723c0481",
  },
  green: {
    BACKGROUND_PRIMARY: "b2805d038f843d716053ec7bfb4c2c57ca894ddb",
    BACKGROUND_SECONDARY: "f39b13f27fc0483f13f75abb7973531c1c7c34a3",
    TYPOGRAPHY_PRIMARY: "ba5bd779872e0139caabe144cf357674a3a9b864",
    TYPOGRAPHY_TERTIARY: "15c971b896e3119e8f2401811d3c1185b305251a",
  },
};

const propsAndTheirOptions = {
  /* prop => [option1, option2] */
};
const variants = {
  /* keyed by "Prop-Value" string */
};

let firstVariant;

if (figma.currentPage.selection.length !== 1) {
  figma.closePlugin("Please select a component with variants");
} else {
  selection = figma.currentPage.selection[0];

  if (selection.type !== "COMPONENT_SET") {
    figma.closePlugin("Please select a component with variants");
  }

  // add Boolean props into propsAndTheirOptions
  const componentPropertyDefinitions =
    selection["componentPropertyDefinitions"];
  Object.keys(componentPropertyDefinitions).forEach((propName) => {
    const prop = componentPropertyDefinitions[propName];
    if (prop.type === "BOOLEAN") {
      propsAndTheirOptions[propName] = [true, false];
    }
  });
  // console.log({ propsAndTheirOptions });

  if (selection && supportsChildren(selection)) {
    selection.children.forEach((child) => {
      if (child.type === "COMPONENT") {
        const pairs = child.name.split(", ");
        pairs.forEach((pair) => {
          const [key, value] = pair.split("=");
          if (typeof propsAndTheirOptions[key] === "undefined") {
            propsAndTheirOptions[key] = [value];
          } else if (!propsAndTheirOptions[key].includes(value)) {
            propsAndTheirOptions[key].push(value);
          }
          if (!firstVariant) {
            firstVariant = child;
          }
          variants[`${key}-${value}`] = child;
        });
        // const childInstance = child.createInstance();
        // specsFrame.appendChild(childInstance);
      }
    });
    figma.clientStorage.getAsync("theme").then((themeFromStorage) => {
      theme = themeFromStorage || "dark";
      figma.ui.postMessage({
        type: "render-ui",
        propsAndTheirOptions,
        theme,
      });
    });
  }
}

// auto-layout attributes
// console.log("fillStyleId", selection["fillStyleId"]);
// console.log("layoutAlign", selection["layoutAlign"]);
// console.log("layoutGrow", selection["layoutGrow"]);
// console.log("primaryAxisSizingMode", selection["primaryAxisSizingMode"]);
// console.log("counterAxisSizingMode", selection["counterAxisSizingMode"]);

figma.showUI(__html__, { width: 300, height: 480 });

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function supportsChildren(
  node: SceneNode
): node is FrameNode | ComponentNode | InstanceNode | BooleanOperationNode {
  return (
    node.type === "FRAME" ||
    node.type === "GROUP" ||
    node.type === "COMPONENT" ||
    node.type === "COMPONENT_SET" ||
    node.type === "INSTANCE" ||
    node.type === "BOOLEAN_OPERATION"
  );
}

function getDSindex(name) {
  const matchResult = name.match(/^([0-9]+\.[0-9]+.*?)\s/);
  return matchResult && matchResult[1];
}

function getStyleId(styleKey) {
  return fetchedStyles[styleKey].id;
}

const renderSectionFrame = (title, child) => {
  const sectionFrame = createAutoFrame("VERTICAL", 10);

  const sectionHeaderFrame = createAutoFrame("VERTICAL", 14);
  const borderRectangle = figma.createRectangle();
  borderRectangle.resizeWithoutConstraints(1, 1);
  borderRectangle.layoutAlign = "STRETCH";
  setBorderStyles(borderRectangle);

  const sectionHeader = figma.createText();
  setSectionHeaderStyles(sectionHeader);
  sectionHeader.characters = title;

  sectionHeaderFrame.appendChild(sectionHeader);
  sectionHeaderFrame.appendChild(borderRectangle);
  sectionHeaderFrame.layoutAlign = "STRETCH";

  sectionFrame.appendChild(sectionHeaderFrame);
  sectionFrame.appendChild(child);

  return sectionFrame;
};

const renderCombinationsFrame = (
  combinations,
  propsToExclude = [],
  excludePropsThatDontChange = false
) => {
  let propsThatDontChange = Object.keys(combinations[0]);
  combinations.forEach((combination, index) => {
    if (index === 0) {
      return;
    }
    Object.keys(combination).forEach((prop) => {
      if (combination[prop] !== combinations[0][prop]) {
        propsThatDontChange = propsThatDontChange.filter((p) => p !== prop);
      }
    });
  });
  const combinationsFrame = createAutoFrame("HORIZONTAL", 60);
  combinations.forEach((combination) => {
    const combinationFrame = createAutoFrame("VERTICAL", 20);
    const combinationHeader = figma.createText();
    setCombinationHeaderStyles(combinationHeader);
    combinationHeader.characters = getTitleForCombination(
      combination,
      []
        .concat(propsToExclude)
        .concat(excludePropsThatDontChange ? propsThatDontChange : [])
    );
    combinationFrame.appendChild(combinationHeader);
    const instanceForValue = firstVariant.createInstance();
    try {
      instanceForValue.setProperties(combination);
    } catch (e) {}
    combinationFrame.appendChild(instanceForValue);
    combinationsFrame.appendChild(combinationFrame);
  });
  return combinationsFrame;
};

const setSpecsFrameStyles = (specsFrame) => {
  specsFrame.fillStyleId = getStyleId(themeColors[theme]["BACKGROUND_PRIMARY"]);
};

const setSpecsHeadingFrameStyles = (headingFrame) => {
  headingFrame.paddingTop = 100;
  headingFrame.paddingRight = 50;
  headingFrame.paddingBottom = 32;
  headingFrame.paddingLeft = 50;
  headingFrame.fillStyleId = getStyleId(
    themeColors[theme]["BACKGROUND_SECONDARY"]
  );
  headingFrame.layoutAlign = "STRETCH";
};

const setSpecsHeadingTextStyles = (headingText) => {
  headingText.fillStyleId = getStyleId(
    themeColors[theme]["TYPOGRAPHY_PRIMARY"]
  );
  headingText.fontName = { family: "Helvetica Neue", style: "Bold" };
  headingText.fontSize = 38;
};

const setSpecsSubHeadingTextStyles = (sectionHeader) => {
  sectionHeader.fillStyleId = getStyleId(
    themeColors[theme]["TYPOGRAPHY_TERTIARY"]
  );
  sectionHeader.fontName = { family: "Helvetica Neue", style: "Bold" };
  sectionHeader.fontSize = 16;
};

const setSectionHeaderStyles = (sectionHeader) => {
  sectionHeader.fillStyleId = getStyleId(
    themeColors[theme]["TYPOGRAPHY_PRIMARY"]
  );
  sectionHeader.fontName = { family: "Helvetica Neue", style: "Bold" };
  sectionHeader.fontSize = 24;
};

const setOptionHeaderStyles = (optionHeader) => {
  optionHeader.fillStyleId = getStyleId(
    themeColors[theme]["TYPOGRAPHY_PRIMARY"]
  );
  optionHeader.fontName = { family: "Helvetica Neue", style: "Medium" };
  optionHeader.fontSize = 18;
};

const setCombinationHeaderStyles = (combinationHeader) => {
  combinationHeader.fillStyleId = getStyleId(
    themeColors[theme]["TYPOGRAPHY_PRIMARY"]
  );
  combinationHeader.fontName = { family: "Helvetica Neue", style: "Medium" };
  combinationHeader.fontSize = 18;
};

const setBorderStyles = (borderRectangle) => {
  borderRectangle.fillStyleId = getStyleId(
    themeColors[theme]["TYPOGRAPHY_TERTIARY"]
  );
};

const renderSpecs = (
  combinations,
  combinationsGrouped,
  withIndividualProps,
  initProps
) => {
  if (generatedSpecIds[theme]) {
    const previousSpec = figma.getNodeById(generatedSpecIds[theme]);
    previousSpec && previousSpec.remove();
  }
  const specsFrame = createAutoFrame("VERTICAL");
  setSpecsFrameStyles(specsFrame);

  const headingFrame = createAutoFrame("VERTICAL", 8);
  setSpecsHeadingFrameStyles(headingFrame);

  const headingText = figma.createText();
  setSpecsHeadingTextStyles(headingText);
  headingText.characters = selection.name;
  headingFrame.appendChild(headingText);

  if (selection["description"]) {
    const subheadingFrame = figma.createText();
    setSpecsSubHeadingTextStyles(subheadingFrame);
    subheadingFrame.characters = selection["description"];
    headingFrame.appendChild(subheadingFrame);
  }

  specsFrame.appendChild(headingFrame);

  const bodyFrame = createAutoFrame("VERTICAL", 60);
  bodyFrame.fills = [];
  bodyFrame.paddingTop = 60;
  bodyFrame.paddingRight = 50;
  bodyFrame.paddingBottom = 60;
  bodyFrame.paddingLeft = 50;
  generatedSpecIds[theme] = specsFrame.id;

  specsFrame.appendChild(bodyFrame);

  if (withIndividualProps) {
    Object.keys(propsAndTheirOptions).forEach((prop) => {
      const propOptionsFrame = createAutoFrame("HORIZONTAL", 30);
      propsAndTheirOptions[prop].forEach((option) => {
        const optionFrame = createAutoFrame("VERTICAL", 20);
        const optionHeader = figma.createText();
        setOptionHeaderStyles(optionHeader);
        optionHeader.characters = capitalizeFirstLetter(option.toString());
        optionFrame.appendChild(optionHeader);
        const instanceForValue = firstVariant.createInstance();
        try {
          const properties = initProps ? Object.assign({}, initProps) : {};
          properties[prop] = option;
          instanceForValue.setProperties(properties);
        } catch (e) {
          console.log({ e });
        }
        optionFrame.appendChild(instanceForValue);
        propOptionsFrame.appendChild(optionFrame);
      });

      const propFrame = renderSectionFrame(
        capitalizeFirstLetter(prop).split("#")[0], // cut off boolean prop hash index
        propOptionsFrame
      );
      bodyFrame.appendChild(propFrame);
    });
  }

  if (Object.keys(combinationsGrouped).length) {
    Object.keys(combinationsGrouped).forEach((groupUnderString) => {
      const propValuePairs = groupUnderString.split(", ");
      const propsGroupUnder = [];
      propValuePairs.forEach((propValue) => {
        const [prop] = propValue.split(" = ");
        propsGroupUnder.push(prop);
      });
      const combinationsSectionFrame = renderSectionFrame(
        groupUnderString,
        renderCombinationsFrame(
          combinationsGrouped[groupUnderString],
          propsGroupUnder,
          true
        )
      );
      bodyFrame.appendChild(combinationsSectionFrame);
    });
  }

  if (combinations.length) {
    const combinationsSectionFrame = renderSectionFrame(
      "Combinations",
      renderCombinationsFrame(combinations)
    );
    bodyFrame.appendChild(combinationsSectionFrame);
  }

  figma.currentPage.appendChild(specsFrame);
  specsFrame.x = selection.x;
  specsFrame.y = selection.y + selection.height + 100 + specSheetShift;
  figma.viewport.scrollAndZoomIntoView([specsFrame]);
  specSheetShift += specsFrame.height + 100;
};

const getTitleForCombination = (combination, propsToExclude) => {
  let title = "";
  Object.keys(combination).forEach((prop) => {
    if (propsToExclude.includes(prop)) {
      return;
    }
    const propValue = combination[prop];
    const pairTitle = `${prop} = ${propValue}`;
    if (title === "") {
      title = pairTitle;
    } else {
      title += ` +\n${pairTitle}`;
    }
  });
  return title;
};

const createAutoFrame = (mode, itemSpacing?) => {
  const frame = figma.createFrame();
  frame.layoutMode = mode;
  if (itemSpacing) {
    frame.itemSpacing = itemSpacing;
  }
  frame.fills = [];
  frame.layoutAlign = "INHERIT";
  frame.layoutGrow = 0;
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.clipsContent = false;
  return frame;
};

const fetchedStyles = {};

async function fetchStyle(styleKey): Promise<null> {
  const style = await figma.importStyleByKeyAsync(styleKey);
  fetchedStyles[styleKey] = style;
  console.log("fetchedStyle");
  return new Promise((resolve) => resolve(null));
}

async function fetchAllStyles() {
  const processedStyles = [];
  const requiredStyles = [
    ...new Set(Object.values(themeColors["dark"])),
    ...new Set(Object.values(themeColors["light"])),
    ...new Set(Object.values(themeColors["green"])),
  ];
  const promises = requiredStyles.map(fetchStyle);
  return await Promise.all(promises);
}

figma.ui.onmessage = (msg) => {
  if (msg.type === "generate") {
    figma
      .loadFontAsync({ family: "Helvetica Neue", style: "Bold" })
      .then(() =>
        figma.loadFontAsync({ family: "Helvetica Neue", style: "Medium" })
      )
      .then(fetchAllStyles)
      .then(() => {
        specSheetShift = 0;
        ["light", "dark", "green"].forEach((currentTheme) => {
          theme = currentTheme;
          renderSpecs(
            msg.combinations,
            msg.combinationsGrouped,
            msg.withIndividualProps,
            msg.initProps
          );
        });
      });
  } else if (msg.type === "set-theme") {
    theme = msg.theme;
    figma.clientStorage.setAsync("theme", msg.theme);
  }
};
