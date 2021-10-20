/*
1. List of conditions class
2. condition class
3. turn change hook
*/

//Global Variables
const icon = "modules/condition-reminders/icons/Condition-Reminders-Icon.png";

/**
 * A class which holds constants for our Condition List
 */
class ConditionList {
  static ID = 'condition-reminders';

  static FLAGS = {
    CONDITIONS: 'conditions'
  }

  static TEMPLATES = {
    CONDITIONLIST: `modules/${this.ID}/templates/condition-reminders.hbs`
  }

  static initialize() {
    this.ConditionRemindersConfig = new ConditionRemindersConfig();
  }

}

/**
 * Once the game has initialized, set up our module
 */
 Hooks.once('init', () => {
  ConditionList.initialize();
});

//this hook 'fixes' tokens that are supposed to or not supposed to have the condition-reminders icon
Hooks.once('ready', () => {
  //only run this hook once, change me later maybe
  if(game.users.current.isGM) {
    //iterate through each token on the canvas
    for(let i = 0; i < canvas.tokens.objects.children.length; i++) {
      let token = canvas.tokens.objects.children[i];
      let includesIcon = false;
      //see if the token has our icon attached
      if(token.data.effects.includes(icon)) {
        includesIcon = true;
      }
      //if / else if to toggle an icon that should or should not be there
      if(includesIcon && ConditionListData.getNumTokenConditions(token.data._id) == 0) {
        token.toggleEffect(icon);
      }
      else if(!includesIcon && ConditionListData.getNumTokenConditions(token.data._id) > 0) {
        token.toggleEffect(icon);
      }
    }
  }
});

/**
* The data layer for our condition-reminders module
*/
class ConditionListData {

  /**
   * creates a condition and saves it
   * 
   * @param {Partial<Condition>} conditionData - the condition data to use
   */
  static createCondition(conditionData) {
    // generate a random id for this new condition
    const userId = game.userId;

    //generate random id for this condition and populate data
    const newCondition = {
      id: foundry.utils.randomID(16),   
      tokenIds: [],                     
      label: 'enter label',
      ...conditionData,
      userId,
      description: 'enter description'
    }

    // construct the update to insert the new condition
    const newConditions = {
      [newCondition.id]: newCondition
    }

    // update the database with the new condition
    return game.users.get(userId)?.setFlag(ConditionList.ID, ConditionList.FLAGS.CONDITIONS, newConditions);
  }

  /**
   * get all conditions in our condition list
   */
  static get allConditions() {
    return game.users.get(game.userId)?.getFlag(ConditionList.ID, ConditionList.FLAGS.CONDITIONS);
  }

  /**
   * get the number of conditions in our condition list
   */
  static get size() {
    let i = 0;
    for(let key in this.allConditions) {
      i++;
    }
    return i;
  }
  
  /**
   * Gets all conditions of a token in the form of an array
   * 
   * @param {string} tokenId - id of the token to get the conditions of
   * @returns {array<condition>} - array of each condition the token has
   */
  static getConditionsForToken(tokenId) {
    let conditions = [];
    const allConditions = this.allConditions;
    
    //add each condition that a token has to the conditions array
    for(let key in allConditions) {
      if(allConditions[key].tokenIds.includes(tokenId))
        conditions.push(allConditions[key]);
    }

    return conditions;
  }

  /**
   * returns a count of the number of conditions on a token
   * 
   * @param {string} tokenId - id of the token to get the count of
   * @returns {int} - number of conditions
   */
  static getNumTokenConditions(tokenId) {
    let i = 0;
    const allConditions = this.allConditions;

    //increment the counter for each condition that includes the token
    for(let key in allConditions) {
      if(allConditions[key].tokenIds.includes(tokenId)) {
        i++;
      }
    }

    return i;
  }

  /**
   * Deletes a given condition
   * 
   * @param {string} conditionId - id of the condition to delete
   */
  static deleteCondition(conditionId) {

    //check if the condition is applied to any tokens
    if(this.allConditions[conditionId].tokenIds.length > 0) {
      
      //loop through the token ids in the condition
      for(let i = 0; i < this.allConditions[conditionId].tokenIds.length; i++) {
        let tokId = this.allConditions[conditionId].tokenIds[i];

        //remove the icon if the token only has 1 condition (before deletion)
        if(this.getNumTokenConditions(tokId) == 1) {
          let token = canvas.scene.data.tokens.get(tokId);
          token._object.toggleEffect(icon);
        }
      }
    }

    // Foundry specific syntax required to delete a key from a persisted object in the database
    const keyDeletion = {
      [`-=${conditionId}`]: null
    }

    // update the database with the updated Condition list
    return game.users.get(game.userId)?.setFlag(ConditionList.ID, ConditionList.FLAGS.CONDITIONS, keyDeletion);
  }

  /**
   * Updates a given Condition with the provided data
   * 
   * @param {string} conditionId - id of the Condition to update
   * @param {Partial<Condition>} updateData - changes to be persisted
   * @returns 
   */
  static updateCondition(conditionId, updateData) {

    // construct the update to send
    const update = {
      [conditionId]: updateData
    }

    // update the database with the updated ToDo list
    return game.users.get(game.userId)?.setFlag(ConditionList.ID, ConditionList.FLAGS.CONDITIONS, update);
  }

  /**
   * Updates all Conditions with the provided updateData 
   * Useful for updating all conditions in bulk
   * 
   * @param {object} updateData - data passed to setFlag
   * @returns 
   */
  static updateAllConditions(updateData) {
    return game.users.get(game.userId)?.setFlag(ConditionList.ID, ConditionList.FLAGS.CONDITIONS, updateData);
  }

  /**
   * Toggles the given condition on each selected token
   * 
   * @param {string} conditionId - id of the condition to be toggled
   */
  static toggleCondition(conditionId) {
    //check if any tokens are selected, otherwise notify user
    if (canvas.tokens.controlled.length == 0) {
      ui.notifications.error("At Least One Token Must Be Selected");
      return;
    }
    const condition = this.allConditions[conditionId];
    //loop through each selected token
    for (const token of canvas.tokens.controlled) {
      //case of condition having token id
      if(condition.tokenIds.includes(token.id)) {
        this.removeCondition(conditionId, token.id);
      }
      //case of condition not having token id
      else {
        this.addCondition(conditionId, token.id);
        console.log("condition added");
      }
    }

  }

  /**
   * Removes a token id from a condition
   * 
   * @param {string} conditionId - id of the condition to remove token id from
   * @param {string} tokenId - id of the token to be removed
   * @returns 
   */
  static removeCondition(conditionId, tokenId) {
    //case of condition no longer existing, notify user
    if(!this.allConditions[conditionId]) {
      ui.notifications.error("Condition has been deleted or does not exist");
      return;
    }
    const condition = this.allConditions[conditionId];
    //return early if the condition is not on the token
    if(!condition.tokenIds.includes(tokenId)) {
      console.log("No such Condition");
      return;
    }
    //case of condition to be removed
    else {
      const index = condition.tokenIds.indexOf(tokenId);
      //make sure the token id is in the token ids
      if(index > -1) {
        //splice to remove the token id
        condition.tokenIds.splice(index, 1);
        
        //toggle the icon to remove it when the token has no conditions
        if(this.getNumTokenConditions(tokenId) == 0) {
          const token = canvas.scene.data.tokens.get(tokenId);
          //token._object.toggleEffect(icon);
          toggleIcon(token);
        }

        //call updateCondition to update flags and make sure data is saved
        this.updateCondition(conditionId, {tokenIds: condition.tokenIds});
      }
      return;
    }
    
  }

  /**
   * adds a token id to a condition
   * 
   * @param {string} conditionId - id of condition to add token id to
   * @param {string} tokenId - id of token to add
   * @returns 
   */
  static addCondition(conditionId, tokenId) {
    const condition = this.allConditions[conditionId];
    //add token id to the condition
    condition.tokenIds.push(tokenId);
    
    //toggle the icon to add it when the token has gotten its first condition
    if(this.getNumTokenConditions(tokenId) == 1) {
      const token = canvas.scene.data.tokens.get(tokenId);
      //token._object.toggleEffect(icon);
      toggleIcon(token);
      console.log(condition);
    }

    //call updateCondition to update flags and make sure data is saved
    this.updateCondition(conditionId, {tokenIds: condition.tokenIds});
    return;
  }

  
  
}

/**
 * The custom FormApplication subclass which displays and edits Conditions
 */
class ConditionRemindersConfig extends FormApplication {
  static get defaultOptions() {
    const defaults = super.defaultOptions;
  
    const overrides = {
      height: 'auto',
      id: 'condition-reminders',
      template: ConditionList.TEMPLATES.CONDITIONLIST,
      title: 'Condition List',
      userId: game.userId,
      closeOnSubmit: false,
      submitOnChange: true,
    };
  
    const mergedOptions = foundry.utils.mergeObject(defaults, overrides);
    
    return mergedOptions;
  }

  /**
   * Callback passed to Button Click event listener which handles it
   * 
   * @param {MouseEvent} event 
   */
  async _handleButtonClick(event) {
    //get the clicked button
    const clickedElement = $(event.currentTarget);
    //get the action listed under data-action of the button
    const action = clickedElement.data().action;
    //get the condition id from the clicked button
    const conditionID = clickedElement.parents('[data-condition-id]')?.data()?.conditionId;

    //call the function as indicated by the action
    switch (action) {
      case 'create': {
        await ConditionListData.createCondition();
        this.render();
        break;
      }

      case 'delete': {
        await ConditionListData.deleteCondition(conditionID);
        this.render();
        break;
      }

      case 'toggle': {
        await ConditionListData.toggleCondition(conditionID);
        this.render();
        break;
      }
      
      //this should probably not be called but in case it will be logged to the console
      default: 
        console.log(false, 'Invalid Action Detected', action);
    }

  }

  /**
   * @override
   */
  activateListeners(html) {
    super.activateListeners(html);
    
    html.on('click', "[data-action]", this._handleButtonClick.bind(this));
  }

  /**
   * @override
   */
  getData() {
    return {
      conditions: ConditionListData.allConditions
    }
  }

  /**
   * @override
   */
  async _updateObject(event, formData) {
    const expandedData = foundry.utils.expandObject(formData);

    //updates the flags when the form is updated
    await ConditionListData.updateAllConditions(expandedData);

    this.render();

    console.log(false, 'saving', {
      formData,
      expandedData
    });
  }

  
}

async function toggleIcon(token) {
  token.update(token._object.toggleEffect(icon));
}


let lastToken = null; //variable that keeps track of the last token in initiative order
let firstRender = false; //skips the first call so this isn't called on initialization

Hooks.on('renderCombatTracker', (combatTracker, html) => {
  //skip a message being rendered when the combat tracker loads
  if(!firstRender) {
    console.log(firstRender);
    firstRender = true;
    return;
  }
  
  
  let comId = combatTracker.viewed.current.tokenId;
  //skip repeat messages (assumes combat is more than 1 token)
  if(comId == lastToken) {
    return;
  }
  lastToken = comId;

  //get the id of the actor being tracked
  const combatants = combatTracker.viewed.turns;
  let currActorId;
  combatants.forEach(element => {
   if (element.data.tokenId == comId) {
      currActorId = element.data.actorId;
    }
  });
  const actor = game.actors.get(currActorId);
  let tokenId = null;
    
  //gets the selected token using the actor id
  canvas.scene.tokens.forEach(element => {
    //check if the actor id of the token is the same as our selected actor
    if(element._actor.data._id == currActorId) {
      tokenId = element.id;
    }
  });

  //get the tooltip from our language json
  const tooltip = game.i18n.localize('CONDITION-REMINDERS.end-condition');
  let condition;
  //only make message if there is a found token
  if(tokenId) {
    //create a separate message for each condition for readability
    for(let i = 0; i < ConditionListData.getNumTokenConditions(tokenId); i++) {
      condition = ConditionListData.getConditionsForToken(tokenId)[i];

      //message html
      let message = `<b><h2>${condition.label}</h2></b><p>${condition.description}</p>
      </br><button type="button" data-token-id=${tokenId} data-condition-id=${condition.id} title="${tooltip}" data-action="pain" class="condition-list-remove-button">${tooltip}</button>`;
        
      //data of the chatmessage
      let chatData = {
        user: game.user.id,
        speaker: 
          {
            actor: actor,
            //alias will change the name the message shows
            alias: actor.name,
            scene: game.scene,
            token: null,
          },
        content: message,
      };
      //puts our chatmessage in chat
      ChatMessage.create(chatData, {});
    }
  }
});

//hook to put our condition reminders button under the token control tools
Hooks.on('renderSceneControls', (sceneControls, html) => {
  if(game.users.current.isGM) {
    let findMe = html.find(`[data-control="token"]`);
    findMe = findMe.find('ol.control-tools');

    const tooltip = game.i18n.localize('CONDITION-REMINDERS.button-title');
    //make sure this only renders for gm on settings
    findMe.append(
      `<li class="condition-reminders-control-tool" title="${tooltip}">
          <i class ="fas fa-biohazard"></i>
      </li>`

    );

    //on click our button will open up the form
    html.on('click', '.condition-reminders-control-tool', (event) => {
      const userId = $(event.currentTarget).parents('[data-user-id]')?.data()?.userId;
      ConditionList.ConditionRemindersConfig.render(true, {userId});
    });
  }
});

//hook to handle our message button clicks
Hooks.on('renderSidebarTab', (combatTracker, html) => {
  //handle the button click
  html.on('click', ".condition-list-remove-button", (event) => {
    //get the token id attached to the button
    const tokenId = $(event.currentTarget).attr("data-token-id");
    //get the condition id attached to the button
    const conditionId = $(event.currentTarget).attr("data-condition-id");
    //remove the condition when the button is clicked
    ConditionListData.removeCondition(conditionId, tokenId);
    //disable the button
    $(event.currentTarget).attr("disabled", "disabled");

  });

});

