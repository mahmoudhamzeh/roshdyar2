import React from 'react';
import { Route, Redirect } from 'react-router-dom';

const PrivateRoute = ({ component: Component, ...rest }) => {
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
        <Route
            {...rest}
            render={props =>
                isLoggedIn() ? (
                    <Component {...props} />
                ) : (
                    <Redirect to="/register" />
                )
            }
        />
    );
};

export default PrivateRoute;
