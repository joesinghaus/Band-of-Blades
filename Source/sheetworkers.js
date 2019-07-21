/* global on, setAttrs, getAttrs, getSectionIDs, getTranslationByKey,
   generateRowID, removeRepeatingRow, _ */

"use strict";

// Item class for more dependable items.
// Needs to be kept in sync with the corresponding class in definitions.pug.
// Abstract class
class Item {
  constructor(options = {}) {
    this.extraText = String(options.extraText || "");
    this.isFine = Boolean(options.isFine || false);
    this._index = -1;
    this._prefix = "PREFIX_NOT_SET";
  }
  get hasExtraText() {
    return this.extraText.length > 0;
  }
  key() {
    return [
      this.itemBaseType,
      this.isFine,
      this.boxes || 0,
      this.uses || 0,
      this.diamond || false,
      this.hasExtraText,
    ].join("|");
  }
  humanReadablePrefix() {
    const markers = [this.itemBaseType];
    if (this.isFine) markers.push("fine");
    if (this.boxes) markers.push(`${this.boxes}box`);
    if (this.uses) markers.push(`${this.uses}uses`);
    if (this.diamond) markers.push("dia");
    if (this.hasExtraText) markers.push("desc");
    markers.push(this.index);
    return markers.join("_");
  }
  // Human-readable description of this item's base type.
  get itemBaseType() {
    throw new TypeError("Abstract class Item cannot be instantiated.");
  }
  get index() {
    return this._index;
  }
  set index(index) {
    this._index = index;
  }
  get prefix() {
    return this._prefix;
  }
  set prefix(prefix) {
    this._prefix = prefix;
  }
}

class SingleItem extends Item {
  constructor(options = {}) {
    super(options);
    if (options.hasOwnProperty("name")) this.name = String(options.name);
    this.boxes = parseInt(options.boxes) || 0;
    this.uses = parseInt(options.uses) || 0;
    this.diamond = Boolean(options.diamond || false);
  }
  get itemBaseType() {
    return "si";
  }
}

class DoubleItem extends Item {
  constructor(options = {}) {
    super(options);
    const subOptions = {
      isFine: this.isFine,
      boxes: 1,
    };
    const firstOptions = Object.assign({ name: options.firstName }, subOptions);
    const secondOptions = Object.assign(
      { name: options.secondName },
      subOptions
    );
    this._firstItem = new SingleItem(firstOptions);
    this._secondItem = new SingleItem(secondOptions);
  }
  get firstItem() {
    return this._firstItem;
  }
  get secondItem() {
    return this._secondItem;
  }
  get itemBaseType() {
    return "do";
  }
  set index(index) {
    this.firstItem.index = index;
    this.secondItem.index = index;
    this._index = index;
  }
  set prefix(prefix) {
    this.firstItem.prefix = prefix;
    this.secondItem.prefix = prefix;
    this._prefix = prefix;
  }
  get index() {
    return this._index;
  }
  get prefix() {
    return this._prefix;
  }
}

class ItemCreator {
  constructor(type) {
    this._counts = {};
    this._type = type;
  }
  counts() {
    return Object.assign({}, this._counts);
  }
  _count(item) {
    return this._counts[item.key()] || 0;
  }
  _getIndexForNewItem(item) {
    const index = this._count(item);
    this._counts[item.key()] = index + 1;
    return index;
  }
  _getPrefixForItem(item) {
    return `item_${this._type}_${item.humanReadablePrefix()}`;
  }
  Create(options = {}) {
    const itemType = options.double ? DoubleItem : SingleItem;
    const newItem = new itemType(options);
    newItem.index = this._getIndexForNewItem(newItem);
    newItem.prefix = this._getPrefixForItem(newItem);
    return newItem;
  }
}

const lightItems = new ItemCreator("light");
const normalItems = new ItemCreator("normal");
const heavyItems = new ItemCreator("heavy");

const allItems = {
  light: [
    lightItems.Create({ isFine: true }),
    lightItems.Create({ isFine: true }),
    lightItems.Create({ double: true, isFine: true }),
    lightItems.Create({ isFine: true, uses: 3 }),
    lightItems.Create({ isFine: true, extraText: true }),
    lightItems.Create({ isFine: true, boxes: 1 }),
    lightItems.Create(),
    lightItems.Create(),
    lightItems.Create(),
    lightItems.Create(),
    lightItems.Create({ uses: 1 }),
    lightItems.Create({ uses: 3 }),
    lightItems.Create({ uses: 4 }),
    lightItems.Create({ uses: 5 }),
    lightItems.Create({ boxes: 1 }),
  ],
  normal: [
    normalItems.Create({ isFine: true }),
    normalItems.Create({ double: true, isFine: true }),
    normalItems.Create({ isFine: true, extraText: true }),
    normalItems.Create({ isFine: true, uses: 3 }),
    normalItems.Create(),
    normalItems.Create({ double: true }),
    normalItems.Create({ extraText: true }),
    normalItems.Create({ boxes: 1 }),
    normalItems.Create({ uses: 1 }),
    normalItems.Create({ uses: 3 }),
    normalItems.Create({ uses: 5 }),
  ],
  heavy: [
    heavyItems.Create({ isFine: true }),
    heavyItems.Create({ isFine: true, extraText: true }),
    heavyItems.Create({ double: true, isFine: true }),
    heavyItems.Create({ double: true, isFine: true, extraText: true }),
    heavyItems.Create(),
    heavyItems.Create(),
    heavyItems.Create({ uses: 1 }),
    heavyItems.Create({ uses: 1 }),
  ],
};

/* FUNCTIONS */
function dataSetup() {
  Object.keys(playbookData).forEach((playbook) => {
    const info = playbookData[playbook],
      translatedBaseAttributes = ["playbook", "xp_condition"];
    info.name = playbook;

    Object.assign(info.base, {
      playbook: `playbook_${playbook}`,
      sheet_type: "character",
      xp_condition: `xp_condition_${playbook}`,
    });

    if (playbook != "rookie") {
      info.base.setting_show_advanced_abilities = "1";
      info.base.setting_specialist_action = info.specialistAction;
    }
    Object.keys(info.base).forEach((attr) => {
      if (translatedBaseAttributes.includes(attr)) {
        info.base[attr] = getTranslation(info.base[attr]);
      }
    });
    info.ability = info.ability.map((name) => ({
      name: getTranslation(`playbook_ability_${name}`),
      description: getTranslation(`playbook_ability_${name}_desc`),
    }));
    Object.keys(info.items).forEach((type) => {
      info.items[type].forEach((obj) => {
        if (obj.name) obj.name = getTranslation(`item_${obj.name}`);
        if (obj.firstName)
          obj.firstName = getTranslation(`item_${obj.firstName}`);
        if (obj.secondName)
          obj.secondName = getTranslation(`item_${obj.secondName}`);
        if (obj.extraText) {
          obj.extraText = getTranslation(obj.extraText);
        }
      });
    });
  });
  Object.keys(divineData).forEach((divine) => {
    const info = divineData[divine],
      translatedBaseAttributes = [
        "character_name",
        "broken_name",
        "broken_info",
      ];

    Object.keys(info.base).forEach((attr) => {
      if (translatedBaseAttributes.includes(attr)) {
        info.base[attr] = getTranslation(info.base[attr]);
      }
    });
    info.ability = info.ability.map((name) => ({
      name: getTranslation(`divine_ability_${name}`),
      description: getTranslation(`divine_ability_${name}_desc`),
    }));
    if (info.base.sheet_type === "broken") {
      info.ability[0].check = "1";
    }
  });
  const playbookAbilityMap = new Map(
    [
      ...Object.values(playbookData)
        .map((x) => x.ability)
        .reduce((m, v) => {
          v.forEach((a) => m.add(a));
          return m;
        }, new Set()),
    ].map((x) => {
      return [x.name.toLowerCase(), x.description];
    })
  );
  playbookData.medic.ability[0].check = "1";
  [playbookData, actionData, traumaData, blightData, divineData].forEach((x) =>
    Object.freeze(x)
  );
  return playbookAbilityMap;
}

function mySetAttrs(attrs, options, callback) {
  const finalAttrs = Object.keys(attrs).reduce((m, k) => {
    m[k] = `${attrs[k]}`;
    return m;
  }, {});
  if (options && !("silent" in options)) {
    options.silent = true;
  }
  setAttrs(finalAttrs, options, callback);
}

function setAttrsIfNotSet(attrs) {
  getAttrs(Object.keys(attrs), (v) => {
    const setting = {};
    Object.keys(attrs).forEach((k) => {
      if (attrs[k] != v[k]) setting[k] = attrs[k];
    });
    setAttrs(setting);
  });
}

function setAttr(name, value) {
  getAttrs([name], (v) => {
    const setting = {};
    if (v[name] !== `${value}`) setting[name] = `${value}`;
    setAttrs(setting);
  });
}

function boolToFlag(v) {
  return v ? "1" : "0";
}

function getTranslation(key) {
  return getTranslationByKey(key) || `TRANSLATION_KEY_UNDEFINED: ${key}`;
}

// We define our own wrappers for Roll20 event handlers to provide
// a bit more useful feedback and reduce boilerplate.
function register(attrs, callback) {
  if (typeof attrs == "string") attrs = [attrs];

  console.log(`Registering callback for: ${attrs.join(", ")}`);
  const eventString = attrs.map((x) => `change:${x}`).join(" ");
  on(eventString, (event) => {
    console.log(`Triggering for attribute ${event.sourceAttribute}.`);
    callback(event);
  });
}

function registerOpened(callback) {
  console.log("Registering on sheet opening.");
  on("sheet:opened", () => {
    console.log("Triggering for sheet opening.");
    callback();
  });
}

function registerButton(name, callback) {
  console.log(`Registering for button: ${name}`);
  const throttledFunction = _.throttle(
    (event) => {
      console.log(`Triggering for button: ${name}`);
      callback(event);
    },
    200,
    { trailing: false }
  );
  on(`clicked:${name}`, throttledFunction);
}

function fillRepeatingSectionFromData(
  sectionName,
  dataList,
  deleteExistingIfNotChecked = false,
  callback = () => {}
) {
  getSectionIDs(`repeating_${sectionName}`, (idArray) => {
    const existingRowAttributes = [
      ...idArray.map((id) => `repeating_${sectionName}_${id}_check`),
      ...idArray.map((id) => `repeating_${sectionName}_${id}_name`),
    ];
    getAttrs(existingRowAttributes, (v) => {
      if (deleteExistingIfNotChecked) {
        idArray
          .filter((id) => v[`repeating_${sectionName}_${id}_check`] !== "1")
          .forEach((id) =>
            removeRepeatingRow(`repeating_${sectionName}_${id}`)
          );
        idArray = idArray.filter(
          (id) => v[`repeating_${sectionName}_${id}_check`] !== "0"
        );
      }
      const existingRowNames = idArray.map(
        (id) => v[`repeating_${sectionName}_${id}_name`]
      );
      const createdIDs = [];
      const setting = dataList
        .filter((o) => !existingRowNames.includes(o.name))
        .map((o) => {
          let rowID;
          while (!rowID) {
            let newID = generateRowID();
            if (!createdIDs.includes(newID)) {
              rowID = newID;
              createdIDs.push(rowID);
            }
          }
          const newAttrs = {};
          return Object.keys(o).reduce((m, key) => {
            m[`repeating_${sectionName}_${rowID}_${key}`] = o[key];
            return m;
          }, newAttrs);
        })
        .reduce((m, o) => Object.assign(m, o), {});
      mySetAttrs(setting, {}, callback);
    });
  });
}

const kComma = "&" + "#44" + ";";
const kBrace = "&" + "#125" + ";";
const kDBrace = kBrace + kBrace;

function diceMagic(num) {
  if (num > 0) {
    return [...Array(num).keys()]
      .map((i) => i + 1)
      .map((i) => {
        return `{{die${i}=[[d6]]${i < num ? kComma : ""}${kDBrace}`;
      })
      .join(" ");
  } else {
    return `{{zerodie1=[[d6]]${kComma}${kDBrace} {{zerodie2=[[d6]]${kDBrace}`;
  }
}

function buildRollFormula(base) {
  return `?{@{bonusdice}|${[0, 1, 2, 3, 4, 5, 6, -1, -2, -3]
    .map((n) => `${n},${diceMagic(n + (parseInt(base) || 0))}`)
    .join("|")}}`;
}

function buildNumdiceFormula() {
  return `?{${getTranslation("numberofdice")}|${[0, 1, 2, 3, 4, 5, 6]
    .map((n) => `${n},${diceMagic(n)}`)
    .join("|")}}`;
}

function setEngagementQuery() {
  getAttrs(["sheet_type"], (v) => {
    console.log(v);
    if (v.sheet_type !== "marshal") return;
    const getTokens = (mType) =>
      `${getTranslation(`${mType}_mission`)},${["crit", "6", "4_5", "1_3"]
        .map(
          (x) => `{{result_${x}=^{engagement_${mType}_${x}${kBrace}${kDBrace}`
        )
        .join(" ")} {{${mType}-mission=1${kDBrace}`;
    setAttrsIfNotSet({
      engagement_roll_query: `?{${[
        getTranslation("mission_type"),
        getTokens("primary"),
        getTokens("secondary"),
      ].join("|")}}`,
    });
  });
}

function handleEveryInchA(event) {
  getAttrs(["repeating_ability_name", "setting_num_heritage_traits"], (v) => {
    const isHeritageAbility =
      v.repeating_ability_name.slice(0, -3) ===
      getTranslation(ABILITY_PLUS_HERITAGE).slice(0, -3);
    if (!isHeritageAbility) return;
    const delta = String(event.newValue) === "1" ? 2 : -2;
    mySetAttrs(
      {
        setting_num_heritage_traits:
          parseInt(v.setting_num_heritage_traits) + delta,
      },
      { silent: false }
    );
  });
}

function handleGottaMakeItOutAlive(event) {
  getAttrs(
    ["playbook", "repeating_ability_name", "setting_extra_trauma"],
    (v) => {
      const isTraumaAbility =
        v.repeating_ability_name ===
        getTranslation(ABILITY_ROOKIE_EXTRA_TRAUMA);
      if (!isTraumaAbility || v.playbook !== getTranslation("playbook_rookie"))
        return;
      const delta = String(event.newValue) === "1" ? 1 : -1;
      mySetAttrs({
        setting_extra_trauma: parseInt(v.setting_extra_trauma) + delta,
      });
    }
  );
}

function handleHeritageChoice() {
  getAttrs([...heritageAttrs, "setting_num_heritage_traits"], (v) => {
    const setting = {};
    const maxTraits = parseInt(v["setting_num_heritage_traits"]) || 0;
    const traitCounts = Object.entries(heritageData).reduce(
      (m, [k, traits]) => {
        m[k] = traits.reduce(
          (m, trait) => m + parseInt(v[`trait_${trait}`]) || 0,
          0
        );
        return m;
      },
      {}
    );
    const totalTraits = Object.values(traitCounts).reduce((m, a) => m + a, 0);
    setting.heritage_traits_chosen = boolToFlag(totalTraits >= maxTraits);
    Object.keys(heritageData).forEach((heritage) => {
      setting[`show_heritage_${heritage}`] = boolToFlag(
        totalTraits === 0 || traitCounts[heritage] > 0
      );
    });
    mySetAttrs(setting);
  });
}

function calculateResistance(attrName) {
  getAttrs(
    [
      ...actionData[attrName],
      `${attrName}_bonus`,
      ...specialistActions,
      "setting_specialist_action",
    ],
    (v) => {
      const total =
        // base resistance from the actions
        actionData[attrName]
          .map((x) => v[x])
          .reduce((s, c) => s + (`${c}` === "0" ? 0 : 1), 0) +
        // bonus field
        parseInt(v[`${attrName}_bonus`]) +
        // if insight: add the specialist action
        (attrName == "insight" && v.setting_specialist_action
          ? v[v.setting_specialist_action] !== "0"
            ? 1
            : 0
          : 0);
      mySetAttrs({
        [attrName]: total,
        [`${attrName}_formula`]: buildRollFormula(total),
      });
    }
  );
}

function calculateTrauma(event) {
  getAttrs(traumaData.map((x) => `trauma_${x}`), (v) => {
    if (event.sourceType === "player") {
      const newTrauma = traumaData.reduce(
        (m, name) => m + (parseInt(v[`trauma_${name}`]) || 0),
        0
      );
      setAttr("trauma", newTrauma);
    }
  });
}
function calculateBlight(event) {
  getAttrs(blightData.map((x) => `blight_${x}`), (v) => {
    if (event.sourceType === "player") {
      const newBlight = blightData.reduce(
        (m, name) => m + (parseInt(v[`blight_${name}`]) || 0),
        0
      );
      setAttr("blight", newBlight);
    }
  });
}

function cleanChatImage(event) {
  const RE = /^(https:\/\/s3\.amazonaws\.com\/files\.d20\.io\/images\/.*)\/(?:med|max|original|thumb)\.(jpg|png)\?\d+$/;
  const match = (event.newValue || "").match(RE);
  if (match) setAttr("chat_image", `${match[1]}/thumb.${match[2]}`);
}

function fillAbility(prefix, abilityMap) {
  getAttrs([`${prefix}_name`, `${prefix}_description`], (v) => {
    if (!v[`${prefix}_description`]) {
      const description = abilityMap.get(
        (v[`${prefix}_name`] || "").toLowerCase()
      );
      if (description) setAttr(`${prefix}_description`, description);
    }
  });
}

function handleAutoExpandWhitespace(names) {
  names.forEach((name) => {
    register(name, (event) => {
      const attrName = name.replace(":", "_");
      getAttrs([attrName], (v) => {
        if (
          v[attrName].trim() !== v[attrName] &&
          event.sourceType === "player"
        ) {
          setAttr(attrName, v[attrName].trim());
        }
      });
    });
  });
}

function handlePseudoRadio(name) {
  register(name, (event) => {
    if (`${event.newValue}` === "0" && event.sourceType === "player") {
      setAttr(name, (parseInt(event.previousValue) || 1) - 1);
    }
    setAttr(`${name}_formula`, buildRollFormula(event.newValue || "0"));
  });
}

function handleSheetInit() {
  getAttrs(["sheet_type"], (v) => {
    /* Make sure sheet_type is never undefined */
    if (
      !["character", "broken", "chosen", ...legionPlaybooks].includes(
        v.sheet_type
      )
    ) {
      setAttr("sheet_type", "character");
    }
  });
  /* Setup and upgrades */
  getAttrs(["version"], (v) => {
    const addVersion = (object, version) => {
      object.version = version;
      object.character_sheet = `Band of Blades v${version}`;
    };
    const upgradeSheet = (version) => {
      // const versionMajor = version && parseInt(version.split(".")[0]),
      //   versionMinor = version && parseInt(version.split(".")[1]);
      console.log(`Found version ${version}.`);
      if (version !== sheetVersion) console.log("Performing sheet upgrade.");
      // Fallback: set to current version.
      const setting = {};
      addVersion(setting, sheetVersion);
      mySetAttrs(setting);
    };
    const initialiseSheet = () => {
      const setting = ["ability"].reduce((memo, sectionName) => {
        memo[`repeating_${sectionName}_${generateRowID()}_autogen`] = 1;
        return memo;
      }, {});
      addVersion(setting, sheetVersion);
      /* Set translated default values */
      getAttrs(Object.keys(translatedDefaults), (v) => {
        Object.keys(translatedDefaults).forEach((k) => {
          if (v[k] !== translatedDefaults[k]) {
            setting[k] = translatedDefaults[k];
          }
        });
        mySetAttrs(setting);
        console.log("Initialising new sheet.");
      });
    };
    if (v.version) upgradeSheet(v.version);
    else initialiseSheet();
  });
}

function setupTranslatedAttrs() {
  /* Set up translated attributes */
  const translatedAttrs = {
    bonusdice: getTranslation("bonusdice"),
    effect_query: getTranslation("effect_query"),
    notes_query: `?{${getTranslation("notes")}}`,
    numberofdice: buildNumdiceFormula(),
    position_query: `?{${getTranslation("position")}|${getTranslation(
      "risky"
    )},position=${getTranslation("risky")}|${getTranslation(
      "controlled"
    )},position=${getTranslation("controlled")}|${getTranslation(
      "desperate"
    )},position=${getTranslation("desperate")}|${getTranslation(
      "fortune_roll"
    )},short=short}`,
  };
  getAttrs(Object.keys(translatedAttrs), (v) => {
    const setting = {};
    Object.keys(translatedAttrs).forEach((name) => {
      if (v[name] !== translatedAttrs[name])
        setting[name] = translatedAttrs[name];
    });
    mySetAttrs(setting);
  });
}

/* Menu-related functions */
function openMenu() {
  setAttrs({
    menu_mode: "sheet_choice",
    show_menu: "1",
    show_settings: "0",
  });
}

function closeMenu() {
  setAttrs({
    show_menu: "0",
  });
}

function prepareForRookiePromotion() {
  getAttrs(["rookie_upgrade", "upgraded_from_rookie"], (v) => {
    if (v.rookie_upgrade == "1" && v.upgraded_from_rookie == "0")
      setAttrs({
        menu_mode: "rookie_to_soldier",
        show_menu: "1",
      });
  });
}

function cancelRookiePromotion() {
  setAttrs({
    rookie_upgrade: "0",
    show_menu: "0",
  });
}

function prepareForSoldierPromotion() {
  getAttrs(
    [
      "soldier_upgrade",
      "upgraded_from_soldier",
      "consort",
      "discipline",
      "maneuver",
      "research",
      "skirmish",
      "scout",
      "shoot",
      "sway",
      "wreck",
    ],
    (v) => {
      if (v.soldier_upgrade == "1" && v.upgraded_from_soldier == "0") {
        const setting = {
          menu_mode: "soldier_to_specialist",
          show_menu: "1",
        };
        setting.promo_eligible_heavy = boolToFlag(
          v.skirmish >= "2" && v.wreck >= "1"
        );
        setting.promo_eligible_medic = boolToFlag(
          v.consort >= "1" &&
            v.discipline >= "1" &&
            v.maneuver >= "1" &&
            v.research >= "2"
        );
        setting.promo_eligible_officer = boolToFlag(
          v.discipline >= "1" && v.sway >= "2"
        );
        setting.promo_eligible_scout = boolToFlag(
          v.maneuver >= "1" && v.scout >= "2"
        );
        setting.promo_eligible_sniper = boolToFlag(
          v.scout >= "1" && v.shoot >= "2"
        );
        setAttrs(setting);
      }
    }
  );
}

function cancelSoldierPromotion() {
  setAttrs({
    soldier_upgrade: "0",
    show_menu: "0",
  });
}

/* Promotion / Creation helpers */
function setSpecialistAction(playbook) {
  const specialistAction = playbook.specialistAction;
  getAttrs([specialistAction, "changed_attributes"], (v) => {
    const setting = {};
    // Increase specialist ability by 1, to a max of 3.
    setting[specialistAction] = Math.min(
      (parseInt(v[specialistAction]) || 0) + 1,
      3
    );
    mySetAttrs(setting);
  });
}
function fillAbilities(playbook, deleteExisting) {
  fillRepeatingSectionFromData("ability", playbook.ability, deleteExisting);
}

function removeExistingAndFillAbilities(playbook) {
  getSectionIDs("repeating_ability", (idArray) => {
    idArray.forEach((id) => removeRepeatingRow(`repeating_ability_${id}`));
    fillAbilities(playbook, false);
  });
}

function setBaseAttributes(playbook, isPromotion = false) {
  const defaults = {
    broken_info: "",
    setting_show_advanced_abilities: "0",
    setting_show_alchemicals: "0",
    setting_specialist_action: "-",
    xp_condition: "",
  };
  if (!isPromotion) {
    Object.assign(defaults, {
      setting_extra_trauma: "0",
      show_ability_divider: "0",
      show_not_a_rookie_anymore: "0",
      show_specialist_training: "0",
      upgraded_from_rookie: "0",
      upgraded_from_soldier: "0",
    });
  }
  setAttrsIfNotSet(Object.assign(defaults, playbook.base));
}

function determineItemsFromPlaybook(playbook) {
  const setting = {};
  ["light", "normal", "heavy"].forEach((type) => {
    allItems[type].forEach((item) => {
      setting[`${item.prefix}_show`] = "0";
    });

    const creator = new ItemCreator(type);
    playbook.items[type]
      .map((options) => creator.Create(options))
      .forEach((item) => {
        setting[`${item.prefix}_show`] = "1";
        if (item.itemBaseType == "si" && item.name) {
          setting[`${item.prefix}_name`] = item.name;
        } else if (item.itemBaseType == "do") {
          setting[`${item.prefix}_name`] = item.firstItem.name;
          setting[`${item.prefix}_name2`] = item.secondItem.name;
        }
        if (item.hasExtraText) {
          setting[`${item.prefix}_extra`] = item.extraText;
        }
      });
  });
  const creator = new ItemCreator("utility");
  const utilityItems = playbook.items.utility
    .map((options) => creator.Create(options))
    .map((item) => {
      return {
        name: item.name,
        num_boxes: item.boxes,
        num_uses: item.uses,
        diamond: boolToFlag(item.diamond),
        layout_chosen: "1",
      };
    });
  fillRepeatingSectionFromData("item", utilityItems, true);
  setAttrsIfNotSet(setting);
}

function setStartingActions(playbook) {
  getAttrs(["changed_attributes"], (v) => {
    const changedAttributes = (v.changed_attributes || "").split(",");
    const actions = Object.assign(
      actionsFlat.reduce((m, a) => {
        if (!changedAttributes.includes(a)) {
          m[a] = "0";
        }
        return m;
      }, {}),
      playbook.startingActions
    );
    setAttrsIfNotSet(actions);
  });
}

/* Promotion */
function promoteRookieToSoldier() {
  getAttrs(["setting_extra_trauma"], (v) => {
    setAttrs({
      setting_extra_trauma: parseInt(v.setting_extra_trauma) + 1,
      show_menu: "0",
      upgraded_from_rookie: "1",
    });
    performPromotion("soldier");
  });
}
function promoteSoldierToSpecialist(target) {
  setAttrs({
    show_menu: "0",
    upgraded_from_soldier: "1",
  });
  performPromotion(target);
}
function performPromotion(target) {
  const playbook = playbookData[target];
  setSpecialistAction(playbook);
  fillAbilities(playbook, true);
  determineItemsFromPlaybook(playbook);
  setBaseAttributes(playbook, true);
}

/* Character creation */
function initialisePlaybook(target) {
  const playbook = playbookData[target];
  setAttr("show_menu", 0);
  if (playbook.name != "rookie") setSpecialistAction(playbook);
  removeExistingAndFillAbilities(playbook);
  determineItemsFromPlaybook(playbook);
  setStartingActions(playbook);
  setBaseAttributes(playbook);
}

function updateChangedAttrs(event) {
  if (event.sourceType === "player") {
    getAttrs(["changed_attributes"], (v) => {
      const changedAttributes = [
        ...new Set(v.changed_attributes.split(",")).add(event.sourceAttribute),
      ]
        .filter((x) => !!x)
        .join(",");
      setAttr("changed_attributes", changedAttributes);
    });
  }
}

function initialiseMarshal() {
  fillRepeatingSectionFromData(
    "squad",
    startingSquads.map((x) => ({ name: getTranslation(x) }))
  );
  setEngagementQuery();
}
function initialiseQuartermaster() {
  fillRepeatingSectionFromData(
    "materiel",
    startingMateriel.map((x) => ({ name: getTranslation(x) }))
  );
}

function initialiseLegionPlaybook(target) {
  let callback = () => {};
  if (target === "marshal") callback = initialiseMarshal;
  if (target === "quartermaster") callback = initialiseQuartermaster;
  setAttrs(
    {
      sheet_type: target,
      show_menu: "0",
    },
    {},
    callback
  );
}

function generateDivine(target) {
  const divine = divineData[target];
  setAttr("show_menu", 0);
  setBaseAttributes(divine);
  removeExistingAndFillAbilities(divine);
}

function handlePressureChange(event) {
  setAttr("pressure_formula", buildRollFormula(event.newValue || "0"));
}

/* DATA */
const sheetVersion = "1.0";
const playbookData = {
  heavy: {
    ability: [
      "bulwark",
      "backup",
      "tenacious",
      "weaponmaster",
      "war_machine",
      "vigorous",
      "against_the_darkness",
      "elite",
    ],
    base: {},
    items: {
      light: [
        { name: "fine_armor", isFine: true },
        { name: "fine_hand_weapon", isFine: true },
        { name: "flare_gun", uses: 4 },
      ],
      normal: [
        {
          name: "fitted_heavy_plate",
          isFine: true,
          extraText: "replaces_any_armor",
        },
        {
          firstName: "fine_shield",
          secondName: "fine_heavy_weapon",
          isFine: true,
          double: true,
        },
      ],
      heavy: [
        { name: "fine_wrecking_kit", isFine: true },
        {
          name: "fine_tower_shield",
          isFine: true,
          extraText: "replaces_any_shield",
        },
      ],
      utility: [
        { name: "hand_weapon", boxes: 1 },
        { name: "shield", boxes: 1 },
        { name: "supplies", boxes: 1, uses: 5 },
        { name: "", boxes: 2 },
        { name: "heavy_weapon", boxes: 1 },
        { name: "winter_clothing", boxes: 1 },
        { name: "soldiers_kit", boxes: 1 },
        { name: "", boxes: 2 },
        { name: "black_shot", boxes: 2, uses: 3 },
        { name: "oil", boxes: 1, uses: 3 },
        { name: "wrecking_kit", boxes: 1 },
        { name: "reliquary", boxes: 2, uses: 3 },
      ],
    },
    specialistAction: "anchor",
    startingActions: {
      skirmish: "2",
      wreck: "1",
    },
  },
  medic: {
    ability: [
      "attache",
      "first_aid",
      "not_today",
      "doctor_feelgood",
      "field_dressing",
      "chemist",
      "moral_support",
      "elite",
    ],
    base: {
      setting_show_alchemicals: "1",
    },
    items: {
      light: [
        { name: "fine_medic_kit", isFine: true, uses: 3 },
        { name: "tonics", uses: 1 },
        { name: "holy_symbol_of_mercy" },
        { name: "mark_of_the_healing_god", boxes: 1 },
      ],
      normal: [
        { name: "fine_pistol", isFine: true },
        { name: "ammo", uses: 5 },
        { name: "armor" },
        { name: "tonics", uses: 1 },
      ],
      heavy: [{ name: "tonics", uses: 1 }, { name: "tonics", uses: 1 }],
      utility: [
        { name: "hand_weapon", boxes: 1 },
        { name: "shield", boxes: 1 },
        { name: "supplies", boxes: 1, uses: 5 },
        { name: "", boxes: 2 },
        { name: "oil", boxes: 1, uses: 3 },
        { name: "winter_clothing", boxes: 1 },
        { name: "repair_kit", boxes: 1, uses: 3 },
        { name: "", boxes: 2 },
        { name: "bandolier", boxes: 1, uses: 4, diamond: true },
        { name: "black_shot", boxes: 2, uses: 3 },
        { name: "books_n_scrolls", boxes: 1, uses: 2 },
        { name: "reliquary", boxes: 2, uses: 3 },
      ],
    },
    specialistAction: "doctor",
    startingActions: {
      consort: "1",
      discipline: "1",
      maneuver: "1",
      research: "2",
    },
  },
  officer: {
    ability: [
      "tactician",
      "lead_from_the_front",
      "logistical_support",
      "mission_first",
      "obedience",
      "strategist",
      "officer_school",
      "elite",
    ],
    base: {},
    items: {
      light: [
        { name: "fine_armor", isFine: true },
        { name: "fine_hand_weapon", isFine: true },
        { name: "flare_gun", uses: 4 },
        { name: "fine_ornate_clock", isFine: true, boxes: 1 },
      ],
      normal: [
        { name: "fine_luxury_item", isFine: true },
        {
          firstName: "fine_shield",
          secondName: "fine_pistol",
          isFine: true,
          double: true,
        },
        { name: "ammo", uses: 5 },
      ],
      heavy: [
        { name: "battlefield_banner" },
        { name: "fine_heavy_armor", isFine: true, extraText: "replaces_armor" },
      ],
      utility: [
        { name: "hand_weapon", boxes: 1 },
        { name: "shield", boxes: 1 },
        { name: "supplies", boxes: 1, uses: 5 },
        { name: "", boxes: 2 },
        { name: "large_weapon", boxes: 1 },
        { name: "winter_clothing", boxes: 1 },
        { name: "compass_&_maps", boxes: 1 },
        { name: "", boxes: 2 },
        { name: "black_shot", boxes: 2, uses: 3 },
        { name: "oil", boxes: 1, uses: 3 },
        { name: "lenses", boxes: 1 },
        { name: "reliquary", boxes: 2, uses: 3 },
      ],
    },
    specialistAction: "channels",
    startingActions: {
      discipline: "1",
      sway: "2",
    },
  },
  scout: {
    ability: [
      "ghost",
      "panther-like_grace",
      "like_the_wind",
      "infiltrator",
      "sixth_sense",
      "ready_for_anything",
      "daredevil",
      "elite",
    ],
    base: {},
    items: {
      light: [
        { name: "fine_compass_&_maps", isFine: true },
        { name: "fine_bow_&_arrows", isFine: true },
        { name: "black_arrows", uses: 3, isFine: true },
      ],
      normal: [
        { name: "climbing_kit" },
        { name: "fine_lenses", isFine: true },
        { name: "fine_reliquary", isFine: true, uses: 3 },
      ],
      heavy: [{ name: "camo_gear" }, { name: "fine_armor", isFine: true }],
      utility: [
        { name: "hand_weapon", boxes: 1 },
        { name: "pistol", boxes: 1 },
        { name: "supplies", boxes: 1, uses: 5 },
        { name: "", boxes: 2 },
        { name: "large_weapon", boxes: 1 },
        { name: "ammo", boxes: 1, uses: 5 },
        { name: "winter_clothing", boxes: 1 },
        { name: "", boxes: 2 },
        { name: "black_shot", boxes: 2, uses: 3 },
        { name: "flare_gun", boxes: 1, uses: 4 },
        { name: "soldiers_kit", boxes: 1 },
        { name: "reliquary", boxes: 2, uses: 3 },
      ],
    },
    specialistAction: "scrounge",
    startingActions: {
      maneuver: "1",
      scout: "2",
    },
  },
  sniper: {
    ability: [
      "one_eye",
      "ambush",
      "akimbo",
      "notches",
      "sharpshooter",
      "cover_fire",
      "crimson_shot",
      "elite",
    ],
    base: {},
    items: {
      light: [
        { name: "black_shot", uses: 3 },
        { name: "ammo", uses: 5 },
        {
          firstName: "2_fine_pistols",
          secondName: "fine_long_rifle",
          isFine: true,
          double: true,
        },
      ],
      normal: [
        { name: "gun_maintenance_kit" },
        { name: "fine_armor", isFine: true },
      ],
      heavy: [
        {
          firstName: "2_fine_pistols",
          secondName: "fine_long_rifle",
          isFine: true,
          double: true,
          extraText: "whichever_you_didnt_take_at_light_load",
        },
      ],
      utility: [
        { name: "crimson_shot", boxes: 1, diamond: true },
        { name: "pistol", boxes: 1 },
        { name: "supplies", boxes: 1, uses: 5 },
        { name: "", boxes: 2 },
        { name: "hand_weapon", boxes: 1 },
        { name: "ammo", boxes: 1, uses: 5 },
        { name: "winter_clothing", boxes: 1 },
        { name: "", boxes: 2 },
        { name: "black_shot", boxes: 2, uses: 3 },
        { name: "oil", boxes: 1, uses: 3 },
        { name: "soldiers_kit", boxes: 1 },
        { name: "reliquary", boxes: 2, uses: 3 },
      ],
    },
    specialistAction: "aim",
    startingActions: {
      scout: "1",
      shoot: "2",
    },
  },
  rookie: {
    ability: [
      "devils_own_luck",
      "every_inch_a",
      "hard_knocks",
      "just_a_kid",
      "gotta_make_it_out_alive",
      "home_cooking",
      "jack_of_all_trades",
    ],
    base: {
      setting_extra_trauma: "-1",
      show_ability_divider: "1",
      show_not_a_rookie_anymore: "1",
    },
    items: {
      light: [
        { name: "naive_hope" },
        { name: "memento_of_home" },
        { name: "soldiers_kit" },
        { name: "musket" },
        { name: "ammo", uses: 5 },
      ],
      normal: [
        { name: "family_weapon" },
        {
          firstName: "tents_&_camping_gear",
          secondName: "cooking_kit",
          double: true,
        },
        { name: "fresh_food", boxes: 1 },
      ],
      heavy: [{ name: "armor" }, { name: "shield" }],
      utility: [
        { name: "armor", boxes: 1 },
        { name: "shield", boxes: 1 },
        { name: "supplies", boxes: 1, uses: 5 },
        { name: "", boxes: 2 },
        { name: "hand_weapon", boxes: 1 },
        { name: "winter_clothing", boxes: 1 },
        { name: "medic_kit", boxes: 1, uses: 3 },
        { name: "", boxes: 2 },
        { name: "black_shot", boxes: 2, uses: 3 },
        { name: "oil", boxes: 1, uses: 3 },
        { name: "climbing_kit", boxes: 1 },
        { name: "reliquary", boxes: 2, uses: 3 },
      ],
    },
    startingActions: {
      consort: "1",
      maneuver: "1",
      skirmish: "1",
    },
  },
  soldier: {
    ability: [
      "relentless",
      "over_the_top",
      "iron_will",
      "loaded_for_bear",
      "eat_iron_shit_nails",
      "grenadier",
      "cavalry",
      "elite",
    ],
    base: {
      show_ability_divider: "1",
      show_specialist_training: "1",
    },
    items: {
      light: [
        { name: "fine_armor", isFine: true },
        { name: "memento_of_home" },
        { name: "fine_hand_weapon", isFine: true },
        { name: "fine_kit", isFine: true, extraText: "pick_one_kit" },
      ],
      normal: [
        { name: "+2_utility" },
        {
          firstName: "fine_heavy_weapon",
          secondName: "fine_shield",
          double: true,
          isFine: true,
        },
      ],
      heavy: [
        { name: "+1_utility" },
        { name: "fine_heavy_armor", isFine: true, extraText: "replaces_armor" },
      ],
      utility: [
        { name: "musket", boxes: 1 },
        { name: "ammo", boxes: 1, uses: 5 },
        { name: "supplies", boxes: 1, uses: 5 },
        { name: "", boxes: 2 },
        { name: "pistol", boxes: 1 },
        { name: "winter_clothing", boxes: 1 },
        { name: "medic_kit", boxes: 1, uses: 3 },
        { name: "", boxes: 2 },
        { name: "black_shot", boxes: 2, uses: 3 },
        { name: "oil", boxes: 1, uses: 3 },
        { name: "soldiers_kit", boxes: 1 },
        { name: "reliquary", boxes: 2, uses: 3 },
      ],
    },
    specialistAction: "grit",
    startingActions: {
      consort: "1",
      maneuver: "1",
      skirmish: "1",
    },
  },
};
const divineData = {
  shreya: {
    ability: [
      "book_of_hours",
      "asrika’s_mercy",
      "asrika’s_blessing",
      "asrika’s_tears",
      "anointed_shreya",
      "battle-saint",
      "blood_of_the_chosen",
      "war-saint",
    ],
    base: {
      character_name: "chosen_shreya_name",
      chosen_type: "shreya",
      sheet_type: "chosen",
    },
  },
  horned_one: {
    ability: [
      "horned_god’s_bounty",
      "horned_god’s_eyes",
      "horned_god’s_thews",
      "shapeshifter",
      "anointed_horned",
      "great_hunter",
      "forest’s_wings",
      "hide_of_the_white_hind",
    ],
    base: {
      character_name: "chosen_horned_one_name",
      chosen_type: "horned_one",
      sheet_type: "chosen",
    },
  },
  zora: {
    ability: [
      "star_of_the_dawn",
      "sacred_seals",
      "living_god’s_fury",
      "living_god’s_kiss",
      "living_god’s_vigor",
      "heart_of_heroes",
      "anointed_zora",
      "blood_of_fire",
    ],
    base: {
      character_name: "chosen_zora_name",
      chosen_type: "zora",
      sheet_type: "chosen",
    },
  },
  blighter: {
    ability: [
      "abominable_science",
      "attrition_strategies",
      "cruel_gluttony",
      "toxic_bile",
      "modern_warfare",
      "scars_of_war",
      "toxic_mutagen",
      "violent_emulsion",
    ],
    base: {
      broken_type: "blighter",
      broken_info: "broken_blighter_info",
      character_name: "broken_blighter",
      sheet_type: "broken",
    },
  },
  breaker: {
    ability: [
      "the_coven",
      "the_changing_curse",
      "pillar_of_skulls",
      "nature’s_fury",
      "storm_riding",
      "wild_awakening",
      "dark_visions",
      "defilement",
    ],
    base: {
      broken_type: "breaker",
      broken_info: "broken_breaker_info",
      character_name: "broken_breaker",
      sheet_type: "broken",
    },
  },
  render: {
    ability: [
      "the_sworn",
      "the_forge",
      "heartless",
      "spearforge",
      "fury",
      "shredders",
      "forced_march",
      "massacre",
    ],
    base: {
      broken_type: "render",
      broken_info: "broken_render_info",
      chracter_name: "broken_render",
      sheet_type: "broken",
    },
  },
};

const playbooks = Object.keys(playbookData);
const divine = Object.keys(divineData);
const actionData = {
  insight: ["research", "scout", "rig"],
  prowess: ["wreck", "skirmish", "shoot", "maneuver"],
  resolve: ["consort", "discipline", "marshal", "sway"],
};
const traumaData = [
  "cold",
  "haunted",
  "obsessed",
  "paranoid",
  "reckless",
  "soft",
  "unstable",
  "vicious",
];
const blightData = [
  "anathema",
  "host",
  "hunger",
  "miasma",
  "mutation",
  "rage",
  "rot",
  "visions",
];
const specialistActions = [
  "aim",
  "anchor",
  "channels",
  "doctor",
  "grit",
  "scrounge",
  "weave",
];
const legionPlaybooks = [
  "commander",
  "marshal",
  "quartermaster",
  "lorekeeper",
  "spymaster",
];
const startingSquads = [
  "ember_wolves",
  "shattered_lions",
  "grinning_ravens",
  "ghost_owls",
  "star_vipers",
  "silver_stags",
];
const startingMateriel = [
  "horses",
  "black_shot",
  "horses",
  "black_shot",
  "horses",
  "black_shot",
  "religious_supplies",
  "religious_supplies",
];
const heritageData = {
  bartan: ["warm", "pious", "stoic", "educated"],
  panyar: ["artisan", "traveler", "shrewd", "marked"],
  orite: ["noble", "connected", "vengeful", "stern"],
  zemyati: ["tough", "bold", "loyal", "stubborn"],
};
const ABILITY_PLUS_HERITAGE = "playbook_ability_every_inch_a";
const ABILITY_ROOKIE_EXTRA_TRAUMA = "playbook_ability_gotta_make_it_out_alive";
const translatedDefaults = {};

/* PRE-COMPUTED CONSTANTS */
const playbookAbilityMap = dataSetup();
const actionsFlat = [].concat(...Object.values(actionData));
const watchedAttributes = [
  "setting_extra_trauma",
  ...actionsFlat,
  ...specialistActions,
];
const heritageAttrs = []
  .concat(...Object.values(heritageData))
  .map((x) => `trait_${x}`);

const autoExpandFields = [
  "repeating_ability:name",
  "repeating_ability:description",
  "repeating_clock:name",
  "char_notes",
  "xp_condition",
  "xp_condition_extra",
];

/* EVENT HANDLERS */
/* watch changes */
register(watchedAttributes, updateChangedAttrs);
/* automatically fill abilities */
register("repeating_ability:name", () =>
  fillAbility("repeating_ability", playbookAbilityMap)
);
/* Register attribute/action event handlers */
Object.keys(actionData).forEach((attrName) => {
  register(
    [...actionData[attrName], `${attrName}_bonus`, ...specialistActions],
    () => calculateResistance(attrName)
  );
});
/* Calculate trauma */
register(traumaData.map((x) => `trauma_${x}`), calculateTrauma);
register(blightData.map((x) => `blight_${x}`), calculateBlight);
/* Extra stress and trauma */
register("setting_extra_stress", (event) =>
  setAttr("stress_max", 9 + (parseInt(event.newValue) || 0))
);
register("setting_extra_trauma", (event) =>
  setAttr("trauma_max", 4 + (parseInt(event.newValue) || 0))
);
/* Heritage */
register("repeating_ability:check", handleEveryInchA);
register("repeating_ability:check", handleGottaMakeItOutAlive);
register(
  [...heritageAttrs, "setting_num_heritage_traits"],
  handleHeritageChoice
);
/* Pseudo-radios */
actionsFlat.forEach(handlePseudoRadio);
specialistActions.forEach(handlePseudoRadio);
/* Trim whitespace in auto-expand fields */
handleAutoExpandWhitespace(autoExpandFields);
/* Clean chat image URL */
register("chat_image", cleanChatImage);
/* Number of dice prompt and other translation-dependent atoms */
registerOpened(setupTranslatedAttrs);
registerOpened(setEngagementQuery);
/* INITIALISATION AND UPGRADES */
registerOpened(handleSheetInit);

/* Menu buttons - Navigation */
registerButton("menu_open", openMenu);
registerButton("menu_cancel", closeMenu);
register("rookie_upgrade", prepareForRookiePromotion);
register("soldier_upgrade", prepareForSoldierPromotion);
registerButton("cancel_rookie_promo", cancelRookiePromotion);
registerButton("cancel_soldier_promo", cancelSoldierPromotion);

/* Menu buttons - sheet creation */
playbooks.forEach((playbook) => {
  registerButton(`generate_${playbook}`, () => initialisePlaybook(playbook));
});
divine.forEach((divine) => {
  registerButton(`generate_${divine}`, () => generateDivine(divine));
});
/* Menu buttons - promotion */
registerButton("promote_to_soldier", promoteRookieToSoldier);
["heavy", "medic", "officer", "scout", "sniper"].forEach((playbook) => {
  registerButton(`promote_to_${playbook}`, () =>
    promoteSoldierToSpecialist(playbook)
  );
});

/* Legion playbooks */
legionPlaybooks.forEach((x) => {
  registerButton(`generate_${x}`, () => initialiseLegionPlaybook(x));
});
register("pressure", handlePressureChange);
