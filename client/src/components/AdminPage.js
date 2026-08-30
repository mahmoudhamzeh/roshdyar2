import React from 'react';
import { NavLink, Switch, Route, useRouteMatch, Redirect } from 'react-router-dom';
import './AdminPage.css';
import AdminDashboard from './admin/AdminDashboard';
import UserManagement from './admin/UserManagement';
import UserDetailPage from './admin/UserDetailPage';
import BannerManagement from './admin/BannerManagement';
import ArticleManagement from './admin/ArticleManagement';
import TicketManagement from './admin/TicketManagement';
import VideoManagement from './admin/VideoManagement';
import PodcastManagement from './admin/PodcastManagement';
import MessageManagement from './admin/MessageManagement';
import ProductManagement from './admin/ProductManagement';
import OrderManagement from './admin/OrderManagement';


const AdminPage = () => {
    let { path, url } = useRouteMatch();

    return (
        <div className="admin-page-container">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <h3>مدیریت</h3>
                </div>
                <nav className="admin-nav">
                    <NavLink to={`${url}/dashboard`} activeClassName="active">داشبورد</NavLink>
                    <NavLink to={`${url}/users`} activeClassName="active">مدیریت کاربران</NavLink>
                    <NavLink to={`${url}/messages`} activeClassName="active">پیام‌ها</NavLink>
                    <NavLink to={`${url}/products`} activeClassName="active">محصولات فروشگاه</NavLink>
                    <NavLink to={`${url}/orders`} activeClassName="active">سفارش‌ها</NavLink>
                    <NavLink to={`${url}/banners`} activeClassName="active">مدیریت بنرها</NavLink>
                    <NavLink to={`${url}/articles`} activeClassName="active">مدیریت مقالات</NavLink>
                    <NavLink to={`${url}/videos`} activeClassName="active">مدیریت ویدیوها</NavLink>
                    <NavLink to={`${url}/podcasts`} activeClassName="active">مدیریت پادکست‌ها</NavLink>
                    <NavLink to={`${url}/tickets`} activeClassName="active">تیکت‌ها</NavLink>
                </nav>
            </aside>
            <main className="admin-main-content">
                <Switch>
                    <Route exact path={path}>
                        <Redirect to={`${path}/dashboard`} />
                    </Route>
                    <Route path={`${path}/dashboard`} component={AdminDashboard} />
                    <Route exact path={`${path}/users`} component={UserManagement} />
                    <Route path={`${path}/users/:userId`} component={UserDetailPage} />
                    <Route path={`${path}/messages`} component={MessageManagement} />
                    <Route path={`${path}/products`} component={ProductManagement} />
                    <Route path={`${path}/orders`} component={OrderManagement} />
                    <Route path={`${path}/banners`} component={BannerManagement} />
                    <Route path={`${path}/articles`} component={ArticleManagement} />
                    <Route path={`${path}/videos`} component={VideoManagement} />
                    <Route path={`${path}/podcasts`} component={PodcastManagement} />
                    <Route path={`${path}/tickets`} component={TicketManagement} />
                </Switch>
            </main>
        </div>
    );
};

export default AdminPage;
