import './app.css';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';
import { matchPath, Route, Routes, useLocation } from 'react-router-dom';
import 'swiped-events';
import { useSnapshot } from 'valtio';

import BackgroundService from './components/background-service';
import ComposeButton from './components/compose-button';
import { ICONS } from './components/icon';
import KeyboardShortcutsHelp from './components/keyboard-shortcuts-help';
import Loader from './components/loader';
import Modals from './components/modals';
import NotificationService from './components/notification-service';
import SearchCommand from './components/search-command';
import Shortcuts from './components/shortcuts';
import NotFound from './pages/404';
import AccountStatuses from './pages/account-statuses';
import Bookmarks from './pages/bookmarks';
import Favourites from './pages/favourites';
import FollowedHashtags from './pages/followed-hashtags';
import Following from './pages/following';
import Hashtag from './pages/hashtag';
import Home from './pages/home';
import Filters from './pages/filters';
import HttpRoute from './pages/http-route';
import List from './pages/list';
import Lists from './pages/lists';
import Login from './pages/login';
import Mentions from './pages/mentions';
import Notifications from './pages/notifications';
import Public from './pages/public';
import Search from './pages/search';
import StatusRoute from './pages/status-route';
import Trending from './pages/trending';
import ForYou from './pages/forYou';
import Topics from './pages/topics';
import Welcome from './pages/welcome';
import {
  api,
  initAccount,
  initClient,
  initInstance,
  initPreferences,
} from './utils/api';
import { getAccessToken } from './utils/auth';
import focusDeck from './utils/focus-deck';
import states, { initStates } from './utils/states';
import store from './utils/store';
import { getCurrentAccount } from './utils/store-utils';
import './utils/toast-alert';
import Link from './components/link';
import Icon from './components/icon';
import AsyncText from './components/AsyncText';
import ImportFriends from './pages/importFriends';
import ImportTwitter from './pages/importTwitter';
import Modal from './components/modal';
import ListManageMembers from './pages/list';
// import {formattedShortcuts} from './utils/shortcuts';
import {subscribeToProvocWordDict} from './utils/vibe-tag';

window.__STATES__ = states;

// Preload icons
// There's probably a better way to do this
// Related: https://github.com/vitejs/vite/issues/10600
setTimeout(() => {
  for (const icon in ICONS) {
    if (Array.isArray(ICONS[icon])) {
      ICONS[icon][0]?.();
    } else {
      ICONS[icon]?.();
    }
  }
}, 5000);

function App() {
  subscribeToProvocWordDict();
  const snapStates = useSnapshot(states);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [uiState, setUIState] = useState('loading');
  store.local.set('provocContentWordDict', '');

  useLayoutEffect(() => {
    const theme = store.local.get('theme');
    if (theme) {
      document.documentElement.classList.add(`is-${theme}`);
      document
        .querySelector('meta[name="color-scheme"]')
        .setAttribute('content', theme === 'auto' ? 'dark light' : theme);
    }
    const textSize = store.local.get('textSize');
    if (textSize) {
      document.documentElement.style.setProperty(
        '--text-size',
        `${textSize}px`,
      );
    }
  }, []);

  useEffect(() => {
    const instanceURL = store.local.get('instanceURL');
    const code = decodeURIComponent(
      (window.location.search.match(/code=([^&]+)/) || [, ''])[1],
    );

    if (code) {
      console.log({ code });
      // Clear the code from the URL
      window.history.replaceState({}, document.title, location.pathname || '/');

      const clientID = store.session.get('clientID');
      const clientSecret = store.session.get('clientSecret');
      const vapidKey = store.session.get('vapidKey');

      (async () => {
        setUIState('loading');
        const { access_token: accessToken } = await getAccessToken({
          instanceURL,
          client_id: clientID,
          client_secret: clientSecret,
          code,
        });

        const client = initClient({ instance: instanceURL, accessToken });
        await Promise.allSettled([
          initInstance(client, instanceURL),
          initAccount(client, instanceURL, accessToken, vapidKey),
        ]);
        initStates();
        initPreferences(client);

        setIsLoggedIn(true);
        setUIState('default');
      })();
    } else {
      window.__IGNORE_GET_ACCOUNT_ERROR__ = true;
      const account = getCurrentAccount();
      const myCurrentInstance = api().instance;
      store.local.set('instanceURL', myCurrentInstance);
      const { instance } = api();
      const { masto } = api({ instance });

      if (account) {
        store.session.set('currentAccount', account.info.id);
        const { client } = api({ account });
        const { instance } = client;

        // console.log('masto', masto);
        initStates();
        initPreferences(client);
        setUIState('loading');
        (async () => {
          try {
            await initInstance(client, instance);
          } catch (e) {
          } finally {
            setIsLoggedIn(true);
            setUIState('default');
          }
        })();
      } else {
        setUIState('default');
      }
    }
  }, []);

  let location = useLocation();
  states.currentLocation = location.pathname;

  useEffect(focusDeck, [location, isLoggedIn]);

  const prevLocation = snapStates.prevLocation;
  const backgroundLocation = useRef(prevLocation || null);
  const isModalPage = useMemo(() => {
    return (
      matchPath('/:instance/s/:id', location.pathname) ||
      matchPath('/s/:id', location.pathname)
    );
  }, [location.pathname, matchPath]);
  if (isModalPage) {
    if (!backgroundLocation.current) backgroundLocation.current = prevLocation;
  } else {
    backgroundLocation.current = null;
  }
  console.debug({
    backgroundLocation: backgroundLocation.current,
    location,
  });

  if (/\/https?:/.test(location.pathname)) {
    return <HttpRoute />;
  }

  const nonRootLocation = useMemo(() => {
    const { pathname } = location;
    return !/^\/(login|welcome)/.test(pathname);
  }, [location]);

  // Change #app dataset based on snapStates.settings.shortcutsViewMode
  useEffect(() => {
    const $app = document.getElementById('app');
    if ($app) {
      $app.dataset.shortcutsViewMode = snapStates.shortcuts?.length
        ? snapStates.settings.shortcutsViewMode
        : '';
    }
  }, [snapStates.shortcuts, snapStates.settings.shortcutsViewMode]);

  // Add/Remove cloak class to body
  useEffect(() => {
    const $body = document.body;
    $body.classList.toggle('cloak', snapStates.settings.cloakMode);
  }, [snapStates.settings.cloakMode]);

  const instanceUrl = store.local.get('instanceURL');

    let trending = instanceUrl?.indexOf('skybridge.fly.dev') > -1 ? 
    {
      id: 'trending',
      title: 'Trending',
      subtitle: '',
      path: `/l/1961420711617101824`,
      icon: 'chart',
    } : {
      id: 'trending',
      title: 'Trending',
      subtitle: '',
      path: `/mastodon.social/trending`,
      icon: 'chart',
    }

    let forYou = instanceUrl?.indexOf('skybridge.fly.dev') > -1 ? 
    {
      id: 'foryou',
      title: 'For You',
      subtitle: '',
      path: `/l/1770979263374688256`,
      icon: 'algorithm',
    } : {
      id: 'foryou',
      title: 'For You',
      subtitle: '',
      path: `/foryou`,
      icon: 'algorithm',
    }

  const formattedShortcuts = [
    {
      icon: "home",
      id: "home",
      path: "/",
      subtitle: undefined,
      title: "Home"
    },
    trending,
    forYou,
    {
      id: 'search',
      title: 'Search',
      path: '/search',
      icon: 'search',
    },
    {
      icon: "notification",
      id: "notifications",
      path: "/notifications",
      subtitle: undefined,
      title: "Notifications"
    },
  ]

  return (
    <>
      <Routes location={nonRootLocation || location}>
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <Home />
            ) : uiState === 'loading' ? (
              <Loader id="loader-root" />
            ) : (
              <Welcome />
            )
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/welcome" element={<Welcome />} />
      </Routes>
      <Routes location={backgroundLocation.current || location}>
        {isLoggedIn && (
          <Route path="/notifications" element={<Notifications />} />
        )}
        {isLoggedIn && <Route path="/mentions" element={<Mentions />} />}
        {isLoggedIn && <Route path="/following" element={<Following />} />}
        {isLoggedIn && <Route path="/b" element={<Bookmarks />} />}
        {isLoggedIn && <Route path="/f" element={<Favourites />} />}
        {isLoggedIn && (
          <Route path="/l">
            <Route index element={<Lists />} />
            <Route path=":id" element={<List />} />
          </Route>
        )}
        {isLoggedIn && <Route path="/importfriends" element={<ImportFriends />} />}
        {isLoggedIn && <Route path="/importtwitter" element={<ImportTwitter />} />}
        {isLoggedIn && <Route path="/fh" element={<FollowedHashtags />} />}
        {isLoggedIn && <Route path="/ft" element={<Filters />} />}
        <Route path="/:instance?/t/:hashtag" element={<Hashtag />} />
        <Route path="/:instance?/a/:id" element={<AccountStatuses />} />
        <Route path="/:instance?/p">
          <Route index element={<Public />} />
          <Route path="l" element={<Public local />} />
        </Route>
        <Route path="/:instance?/trending" element={<Trending />} />
        <Route path="/foryou" element={<ForYou />} />
        {isLoggedIn && <Route path="/topics" element={<Topics />} />}
        <Route path="/:instance?/search" element={<Search />} />
        {/* <Route path="/:anything" element={<NotFound />} /> */}
      </Routes>
      {uiState === 'default' && (
        <Routes>
          <Route path="/:instance?/s/:id" element={<StatusRoute />} />
        </Routes>
      )}
            {/* {true && (
        <Modal
          class="light"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowManageMembersModal(false);
            }
          }}
        >
          <ListManageMembers
            listID={"8133"}
            onClose={() => setShowManageMembersModal(false)}
          />
        </Modal>
      )} */}
      {isLoggedIn && <ComposeButton />}
      {isLoggedIn &&
        !snapStates.settings.shortcutsColumnsMode &&
        snapStates.settings.shortcutsViewMode !== 'multi-column' && (
          <Shortcuts />
        )}
        {isLoggedIn && <nav class="tab-bar">
          <ul>
            {formattedShortcuts.map(
              ({ id, path, title, subtitle, icon }, i) => {
                return (
                  <li key={i + title}>
                    <Link
                      class={title === 'Notifications' && snapStates.notificationsShowNew ? 'has-badge-tab-bar' : ''}
                      to={path}
                      onClick={(e) => {
                        if (e.target.classList.contains('is-active')) {
                          e.preventDefault();
                          const page = document.getElementById(`${id}-page`);
                          // console.log(id, page);
                          if (page) {
                            page.scrollTop = 0;
                            const updatesButton =
                              page.querySelector('.updates-button');
                            if (updatesButton) {
                              updatesButton.click();
                            }
                          }
                        }
                      }}
                    >
                      <Icon icon={icon} size="xl" alt={title} />
                      <span>
                        <AsyncText>{title}</AsyncText>
                        {subtitle && (
                          <>
                            <br />
                            <small>{subtitle}</small>
                          </>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              },
            )}
          </ul>
        </nav>}

      <Modals />
      {isLoggedIn && <NotificationService />}
      <BackgroundService isLoggedIn={isLoggedIn} />
      {uiState !== 'loading' && <SearchCommand onClose={focusDeck} />}
      <KeyboardShortcutsHelp />
    </>
  );
}

export { App };
