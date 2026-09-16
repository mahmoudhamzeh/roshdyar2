import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import AdminPage from './components/AdminPage';
import AdminRoute from './components/AdminRoute';
import PrivateRoute from './components/PrivateRoute';
import DashboardPage from './components/DashboardPage';
import MyChildrenPage from './components/MyChildrenPage';
import AddChildPage from './components/AddChildPage';
import EditChildPage from './components/EditChildPage';
import GrowthChartPage from './components/GrowthChartPage';
import HealthProfilePage from './components/HealthProfilePage';
import HealthAnalysisPage from './components/HealthAnalysisPage';
import LabTestsPage from './components/LabTestsPage';
import ProfilePage from './components/ProfilePage';
import VaccinationPage from './components/VaccinationPage';
import VaccinationStatusPage from './components/VaccinationStatusPage';
import NewsPage from './components/NewsPage';
import ArticleDetailPage from './components/ArticleDetailPage';
import AuthorPage from './components/AuthorPage';
import ShopPage from './components/ShopPage';
import ShopCategoriesPage from './components/ShopCategoriesPage';
import ShopSkillsPage from './components/ShopSkillsPage';
import VendorPanelPage from './components/VendorPanelPage';
import ProductDetailPage from './components/ProductDetailPage';
import CartPage from './components/CartPage';
import CheckoutShippingPage from './components/CheckoutShippingPage';
import CheckoutReviewPage from './components/CheckoutReviewPage';
import CheckoutCallbackPage from './components/CheckoutCallbackPage';
import OrdersPage from './components/OrdersPage';
import ChildGrowthPage from './components/ChildGrowthPage';
import MobileBottomNav from './components/MobileBottomNav';
import { MagazineAudioProvider } from './components/magazine/AudioProvider';
import './App.css';
import './components/magazine/Magazine.css';

const App = () => {
    return (
        <MagazineAudioProvider>
        <Router>
            <Switch>
                <Route path="/login" component={LoginPage} />
                <Route path="/register" component={RegisterPage} />
                <PrivateRoute path="/dashboard" component={DashboardPage} />
                <PrivateRoute path="/my-children" component={MyChildrenPage} />
                <PrivateRoute path="/add-child" component={AddChildPage} />
                <PrivateRoute path="/edit-child/:id" component={EditChildPage} />
                <PrivateRoute path="/growth-chart/:childId" component={GrowthChartPage} />
                <PrivateRoute path="/health-profile/:childId" component={HealthProfilePage} />
                <PrivateRoute path="/health-analysis/:childId" component={HealthAnalysisPage} />
                <PrivateRoute path="/lab-tests/:childId" component={LabTestsPage} />
                <PrivateRoute path="/vaccination-status/:childId" component={VaccinationStatusPage} />
                <PrivateRoute path="/vaccination/:childId" component={VaccinationPage} />
                <PrivateRoute path="/child-growth/:childId" component={ChildGrowthPage} />
                <PrivateRoute path="/age-guidance/:childId" component={ChildGrowthPage} />
                <PrivateRoute path="/profile" component={ProfilePage} />
                <PrivateRoute exact path="/shop" component={ShopPage} />
                <PrivateRoute exact path="/shop/categories" component={ShopCategoriesPage} />
                <PrivateRoute exact path="/shop/skills" component={ShopSkillsPage} />
                <PrivateRoute exact path="/vendor" component={VendorPanelPage} />
                <PrivateRoute path="/shop/:id" component={ProductDetailPage} />
                <Route path="/cart" component={CartPage} />
                <PrivateRoute path="/checkout/shipping" component={CheckoutShippingPage} />
                <PrivateRoute path="/checkout/review" component={CheckoutReviewPage} />
                <Route path="/checkout/callback" component={CheckoutCallbackPage} />
                <PrivateRoute path="/orders" component={OrdersPage} />
                <Route exact path="/news" component={NewsPage} />
                <Route exact path="/news/" render={() => <Redirect to="/news" />} />
                <Route path="/news/category/:slug" component={NewsPage} />
                <Route path="/news/tag/:slug" component={NewsPage} />
                <Route path="/news/author/:slug" component={AuthorPage} />
                <Route path="/news/:id" component={ArticleDetailPage} />
                <AdminRoute path="/admin" component={AdminPage} />

                {/* App home = dashboard; guests are sent to SMS login via PrivateRoute */}
                <Route path="/">
                    <Redirect to="/dashboard" />
                </Route>
            </Switch>
            <MobileBottomNav />
        </Router>
        </MagazineAudioProvider>
    );
};

export default App;
