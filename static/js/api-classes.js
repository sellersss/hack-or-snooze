const BASE_URL = 'https://hack-or-snooze-v3.herokuapp.com';

/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /**
   * This method is designed to be called to generate a new StoryList.
   *  It:
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.*
   */

  // TODO: Note the presence of `static` keyword: this indicates that getStories
  // is **not** an instance method. Rather, it is a method that is called on the
  // class directly. Why doesn't it make sense for getStories to be an instance method?

  static async getStories() {
    // query the /stories endpoint (no auth required)
    const res = await axios.get(`${BASE_URL}/stories`);
    if (res.status == 200) {
      // turn the plain old story objects from the API into instances of the Story class
      const stories = res.data.stories.map((story) => new Story(story));

      // build an instance of our own class using the new array of stories
      const storyList = new StoryList(stories);
      return storyList;
    } else {
      alert('Server may be down... try again later :(');
    }
  }

  /**
   * Method to make a POST request to /stories and add the new story to the list
   * - user - the current instance of User who will post the story
   * - newStory - a new story object for the API with title, author, and url
   *
   *   Returns the new story object
   */

  async addStory(user, newStory) {
    // this function should return the newly created story so it can be used in
    // the script.js file where it will be appended to the DOM
    const res = await axios.post(`${BASE_URL}/stories`, {
      token: user.loginToken,
      story: {
        author: newStory.author,
        title: newStory.title,
        url: newStory.url,
      },
    });

    // add story to list
    newStory = new Story(res.data.story);

    //add the story to the beginning of the list
    this.stories.unshift(newStory);
    //add story to the beginning of the user's list

    user.ownStories.unshift(newStory);
    return newStory;
  }

  async removeStory(user, storyId) {
    await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: 'DELETE',
      data: {
        token: user.loginToken,
      },
    });
    // filter out the story whose ID we are removing
    this.stories = this.stories.filter((story) => story.storyId !== storyId);

    // do the same thing for the user's list of stories
    user.ownStories = user.ownStories.filter((s) => s.storyId !== storyId);
  }
}

/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */

class User {
  constructor(userObj) {
    this.username = userObj.username;
    this.name = userObj.name;
    this.createdAt = userObj.createdAt;
    this.updatedAt = userObj.updatedAt;

    // these are all set to defaults, not passed in by the constructor
    this.loginToken = '';
    this.favorites = [];
    this.ownStories = [];
  }

  /* Create and return a new user.
   *
   * Makes POST request to API and returns newly-created user.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async create(username, password, name) {
    const res = await axios.post(`${BASE_URL}/signup`, {
      user: {
        username,
        password,
        name,
      },
    });
    // build a new User instance from the API res
    const newUser = new User(res.data.user);

    // attach the token to the newUser instance for convenience
    newUser.loginToken = res.data.token;

    return newUser;
  }

  /* Login in user and return user instance.
 
   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const res = await axios.post(`${BASE_URL}/login`, {
      user: {
        username,
        password,
      },
    });

    if (res.status != 200) {
      alert('Server is down, please try again later');
    }
    // build a new User instance from the API res
    const existingUser = new User(res.data.user);

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = res.data.user.favorites.map((s) => new Story(s));
    existingUser.ownStories = res.data.user.stories.map((s) => new Story(s));

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = res.data.token;

    return existingUser;
  }

  /** Get user instance for the logged-in-user.
   *
   * This function uses the token & username to make an API request to get details
   *   about the user. Then it creates an instance of user with that info.
   */

  static async getLoggedInUser(token, username) {
    // if we don't have user info, return null
    if (!token || !username) return null;

    // call the API
    const res = await axios.get(`${BASE_URL}/users/${username}`, {
      params: {
        token,
      },
    });

    // instantiate the user from the API information
    const existingUser = new User(res.data.user);

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = token;

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = res.data.user.favorites.map((s) => new Story(s));
    existingUser.ownStories = res.data.user.stories.map((s) => new Story(s));
    return existingUser;
  }

  async retrieveDetails() {
    const res = await axios.get(`${BASE_URL}/users/${this.username}`, {
      params: {
        token: this.loginToken,
      },
    });

    // update all of the user's properties from the API res
    this.name = res.data.user.name;
    this.createdAt = res.data.user.createdAt;
    this.updatedAt = res.data.user.updatedAt;

    // remember to convert the user's favorites and ownStories into instances of Story
    this.favorites = res.data.user.favorites.map((s) => new Story(s));
    this.ownStories = res.data.user.stories.map((s) => new Story(s));

    return this;
  }

  addFavorite(storyId) {
    return this.toggleFavorite(storyId, 'POST');
  }

  removeFavorite(storyId) {
    return this.toggleFavorite(storyId, 'DELETE');
  }

  async toggleFavorite(storyId, addOrRemove) {
    const res = await axios({
      url: `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
      method: addOrRemove,
      data: {
        token: this.loginToken,
      },
    });

    await this.retrieveDetails();
    return this;
  }
}

/**
 * Class to represent a single story.
 */

class Story {
  /**
   * The constructor is designed to take an object for better readability / flexibility
   * - storyObj: an object that has story properties in it
   */

  constructor(storyObj) {
    this.author = storyObj.author;
    this.title = storyObj.title;
    this.url = storyObj.url;
    this.username = storyObj.username;
    this.storyId = storyObj.storyId;
    this.createdAt = storyObj.createdAt;
    this.updatedAt = storyObj.updatedAt;
  }
}
