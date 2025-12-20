// src/utils/roleNavigation.js

export const navigateByRole = (navigation, role) => {
  // role normalize karein (small case)
  const userRole = (role || '').toLowerCase();

  // Role ke hisab se target screen decide karein
  let targetScreen = '';

  switch (userRole) {
    case 'master':
      targetScreen = 'AdminDashboard';
      break;

    case 'admin':
    case 'customer':
    case 'client':
      targetScreen = 'CustomerDashboard';
      break;

    case 'user':
      targetScreen = 'UserDashboard';
      break;

    default:
      targetScreen = 'UserDashboard';
      break;
  }

  /**
   * navigation.reset ka use karne se:
   * 1. Pura Navigation History delete ho jata hai (Login screen stack se hat jati hai).
   * 2. 'MainTabs' ko fresh load karta hai.
   * 3. 'params' pass karne se MainTabNavigator ko pata chalta hai ki use 'initialRouteName' kya rakhna hai.
   */
  navigation.reset({
    index: 0,
    routes: [
      {
        name: 'MainTabs',
        params: {
          screen: targetScreen, // Yeh tab screen ko direct open karega
          role: userRole, // Yeh Navigator ko logic ke liye role pass karega
        },
      },
    ],
  });
};
