import { createBrowserRouter } from 'react-router-dom';
import { lazy } from 'react';
import { ROUTES } from './paths';
import { AppShell } from '@/components/layout';

const Home = lazy(() => import('@/pages/home'));
const MeriFasal = lazy(() => import('@/pages/meri-fasal'));
const CropDetail = lazy(() => import('@/pages/meri-fasal/crop-detail'));
const SoilTesting = lazy(() => import('@/pages/soil-testing'));
const Weather = lazy(() => import('@/pages/weather'));
const Market = lazy(() => import('@/pages/market'));
const Risk = lazy(() => import('@/pages/risk'));
const Assistant = lazy(() => import('@/pages/assistant'));
const Profile = lazy(() => import('@/pages/profile'));
const Settings = lazy(() => import('@/pages/settings'));
const Notifications = lazy(() => import('@/pages/notifications'));
const Onboarding = lazy(() => import('@/pages/onboarding'));
const LanguageSelect = lazy(() => import('@/pages/language-select'));
const Marketplace = lazy(() => import('@/pages/marketplace'));
const Login = lazy(() => import('@/pages/auth/login'));
const Register = lazy(() => import('@/pages/auth/register'));

export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: ROUTES.MERI_FASAL, element: <MeriFasal /> },
      { path: ROUTES.SOIL_TESTING, element: <SoilTesting /> },
      { path: ROUTES.CROP_DETAIL(':cropId'), element: <CropDetail /> },
      { path: ROUTES.WEATHER, element: <Weather /> },
      { path: ROUTES.MARKET, element: <Market /> },
      { path: ROUTES.MARKETPLACE, element: <Marketplace /> },
      { path: ROUTES.RISK, element: <Risk /> },
      { path: ROUTES.ASSISTANT, element: <Assistant /> },
      { path: ROUTES.PROFILE, element: <Profile /> },
      { path: ROUTES.SETTINGS, element: <Settings /> },
      { path: ROUTES.NOTIFICATIONS, element: <Notifications /> },
      { path: ROUTES.LANGUAGE_SELECT, element: <LanguageSelect /> },
    ],
  },
  { path: ROUTES.ONBOARDING, element: <Onboarding /> },
  { path: ROUTES.LOGIN, element: <Login /> },
  { path: ROUTES.REGISTER, element: <Register /> },
]);
