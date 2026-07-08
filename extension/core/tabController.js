export class TabController {
  constructor(context) {
    this.context = context;
  }

  /**
   * Lifecycle method to initialize the tab controller after constructor is completed.
   * This is safe for subclass constructors to invoke, preventing premature execution
   * of initElements() and bindEvents() before subclass-specific members are set.
   */
  initialize() {
    this.initElements();
    this.bindEvents();
  }

  /**
   * Initialize DOM elements referenced by the controller.
   * Override in subclasses.
   */
  initElements() {
    // Abstract
  }

  /**
   * Bind event listeners to DOM elements.
   * Override in subclasses.
   */
  bindEvents() {
    // Abstract
  }
}
