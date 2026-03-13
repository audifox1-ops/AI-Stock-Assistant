import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, LayoutDashboard, Bell, LineChart } from 'lucide-react';
import './Navigation.css';

const Navigation = () => {
  return (
    <nav className="bottom-nav glass-panel">
      <NavLink to="/home" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Home size={24} />
        <span>홈</span>
      </NavLink>
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <LayoutDashboard size={24} />
        <span>보유종목</span>
      </NavLink>
      <NavLink to="/interest" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Bell size={24} />
        <span>관심/알림</span>
      </NavLink>
      <NavLink to="/analysis" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <LineChart size={24} />
        <span>차트분석</span>
      </NavLink>
    </nav>
  );
};

export default Navigation;
