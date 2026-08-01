import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import LoginPage from './components/LoginPage';
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
import './App.css';

const App = () => {
    const isLoggedIn = () => {
        try {
            const loggedInUser = localStorage.getItem('loggedInUser');
            if (!loggedInUser) return false;
            const user = JSON.parse(loggedInUser);
            return !!(user && user.id);
        } catch (error) {
            return false;
        }
    };

    return (
        <Router>
            <Switch>
                <Route path="/login" component={LoginPage} />
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
                <PrivateRoute path="/profile" component={ProfilePage} />
                <Route exact path="/news" component={NewsPage} />
                <Route path="/news/:id" component={ArticleDetailPage} />
                <AdminRoute path="/admin" component={AdminPage} />

                <Route path="/">
                    <Redirect to={isLoggedIn() ? "/dashboard" : "/login"} />
                </Route>
            </Switch>
        </Router>
    );
};

export default App;
