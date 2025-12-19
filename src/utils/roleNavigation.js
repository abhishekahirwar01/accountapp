// src/utils/roleNavigation.js

export const navigateByRole = (navigation, role) => {
  // role normalize karein (small case)
  const userRole = (role || '').toLowerCase();

  switch (userRole) {
    case 'master':
      // Pehle Parent 'MainTabs' par jayein, fir batayein ki kaunsa 'screen' dikhana hai
      navigation.replace('MainTabs', {
        screen: 'AdminDashboard',
        params: { role: userRole },
      });
      break;

    case 'admin':
    case 'customer':
    case 'client':
      navigation.replace('MainTabs', {
        screen: 'CustomerDashboard',
        params: { role: userRole },
      });
      break;

    case 'user':
      navigation.replace('MainTabs', {
        screen: 'UserDashboard',
        params: { role: userRole },
      });
      break;

    default:
      // fallback
      navigation.replace('MainTabs', {
        screen: 'UserDashboard',
        params: { role: userRole },
      });
      break;
  }
};
