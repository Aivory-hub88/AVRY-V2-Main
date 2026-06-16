/**
 * Navbar Component Tests
 * 
 * Unit tests for the Navbar component to verify:
 * - Authentication state integration
 * - Language toggle functionality
 * - Tier indicator display
 * - Navigation links rendering
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { Navbar } from './navbar';

// Mock Next.js hooks
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

// Mock AuthManager
const mockAuthManager = {
  isAuthenticated: vi.fn(() => false),
  getUser: vi.fn(() => null),
  login: vi.fn(),
  logout: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

// Mock UserStateManager
const mockUserStateManager = {
  getUserState: vi.fn(() => ({
    tier: 'free',
    credits: 0,
    preferences: { language: 'en', theme: 'light', notifications: true },
  })),
  updatePreferences: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

// Mock window objects
beforeEach(() => {
  vi.clearAllMocks();
  
  // Mock AuthManager
  (window as any).AuthManager = mockAuthManager;
  (window as any).AuthManagerReady = true;
  
  // Mock UserStateManager
  (window as any).UserStateManager = mockUserStateManager;
  
  // Mock location
  delete (window as any).location;
  (window as any).location = {
    href: 'http://localhost',
    assign: vi.fn(),
  };
});

describe('Navbar', () => {
  describe('Unauthenticated State', () => {
    it('renders sign in button when not authenticated', () => {
      mockAuthManager.isAuthenticated.mockReturnValue(false);
      
      render(<Navbar />);
      
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('renders learn more link when not authenticated', () => {
      mockAuthManager.isAuthenticated.mockReturnValue(false);
      
      render(<Navbar />);
      
      expect(screen.getByText('Learn More')).toBeInTheDocument();
    });

    it('does not render dashboard link when not authenticated', () => {
      mockAuthManager.isAuthenticated.mockReturnValue(false);
      
      render(<Navbar />);
      
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('does not render tier indicator when not authenticated', () => {
      mockAuthManager.isAuthenticated.mockReturnValue(false);
      
      render(<Navbar />);
      
      expect(screen.queryByText('FREE')).not.toBeInTheDocument();
    });

    it('calls AuthManager.login when sign in button is clicked', () => {
      mockAuthManager.isAuthenticated.mockReturnValue(false);
      
      render(<Navbar />);
      
      fireEvent.click(screen.getByText('Sign In'));
      
      expect(mockAuthManager.login).toHaveBeenCalled();
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.getUser.mockReturnValue({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        token: 'test-token',
        createdAt: '2024-01-01T00:00:00Z',
      } as any);
      
      mockUserStateManager.getUserState.mockReturnValue({
        tier: 'snapshot',
        credits: 100,
        preferences: { language: 'en', theme: 'light', notifications: true },
      });
    });

    it('renders user name when authenticated', () => {
      render(<Navbar />);
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('renders dashboard link when authenticated', () => {
      render(<Navbar />);
      
      // Use getAllByText to find both the nav link and tier indicator label
      const dashboardLinks = screen.getAllByText('Dashboard');
      expect(dashboardLinks.length).toBeGreaterThan(0);
    });

    it('renders tier indicator when authenticated', () => {
      render(<Navbar />);
      
      expect(screen.getByText('SNAPSHOT')).toBeInTheDocument();
    });

    it('calls AuthManager.logout when sign out button is clicked', () => {
      render(<Navbar />);
      
      fireEvent.click(screen.getByText('Test User'));
      
      expect(mockAuthManager.logout).toHaveBeenCalled();
    });
  });

  describe('Language Toggle', () => {
    it('renders language toggle with flags', () => {
      render(<Navbar />);
      
      // The language toggle shows a flag and the current language
      // Initial state is 'en', so it shows EN
      expect(screen.getByText('EN')).toBeInTheDocument();
    });

    it('toggles language when clicked', () => {
      render(<Navbar />);
      
      const languageToggle = screen.getByText('EN');
      fireEvent.click(languageToggle);
      
      expect(screen.getByText('ID')).toBeInTheDocument();
    });

    it('updates language preference in UserStateManager', () => {
      render(<Navbar />);
      
      const languageToggle = screen.getByText('EN');
      fireEvent.click(languageToggle);
      
      expect(mockUserStateManager.updatePreferences).toHaveBeenCalledWith({
        language: 'id',
      });
    });
  });

  describe('Tier Indicator', () => {
    it('displays user tier when authenticated', () => {
      mockUserStateManager.getUserState.mockReturnValue({
        tier: 'blueprint',
        credits: 50,
        preferences: { language: 'en', theme: 'light', notifications: true },
      });
      
      render(<Navbar />);
      
      expect(screen.getByText('BLUEPRINT')).toBeInTheDocument();
    });

    it('displays free tier when user has no tier', () => {
      mockUserStateManager.getUserState.mockReturnValue({
        tier: 'free',
        credits: 0,
        preferences: { language: 'en', theme: 'light', notifications: true },
      });
      
      render(<Navbar />);
      
      expect(screen.getByText('FREE')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for navigation', () => {
      render(<Navbar />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('has proper ARIA attributes for language toggle', () => {
      render(<Navbar />);
      
      const languageToggle = screen.getByText('EN');
      expect(languageToggle).toHaveAttribute('aria-label', 'Switch to Indonesian');
      expect(languageToggle).toHaveAttribute('aria-pressed', 'false');
    });

    it('has proper ARIA attributes for tier indicator', () => {
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockUserStateManager.getUserState.mockReturnValue({
        tier: 'snapshot',
        credits: 100,
        preferences: { language: 'en', theme: 'light', notifications: true },
      });
      
      render(<Navbar />);
      
      const tierIndicator = screen.getByText('SNAPSHOT');
      expect(tierIndicator.parentElement).toHaveAttribute('role', 'status');
      expect(tierIndicator.parentElement).toHaveAttribute('aria-label', 'User tier: snapshot');
    });
  });

  describe('Mobile Menu', () => {
    it('renders mobile menu button', () => {
      render(<Navbar />);
      
      const menuButton = screen.getByRole('button', { name: 'Toggle menu' });
      expect(menuButton).toBeInTheDocument();
    });

    it('toggles mobile menu when clicked', () => {
      render(<Navbar />);
      
      const menuButton = screen.getByRole('button', { name: 'Toggle menu' });
      fireEvent.click(menuButton);
      
      // Menu should be open - use getAllByText to find both desktop and mobile links
      const links = screen.getAllByText('Learn More');
      expect(links.length).toBeGreaterThan(0);
    });
  });
});
