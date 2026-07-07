import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import YourAppointments from '../YourAppointments';

describe('View Appointments from Health Overview', () => {

  /**
   * AC-1
   * Verify user can navigate to Your Appointments
   * by tapping the Your Health Overview card.
   */
  it('should navigate to Your Appointments screen when user taps Your Health Overview', () => {

    const navigate = jest.fn();

    const { getByTestId } = render(
      <HomeScreen
        navigation={{ navigate }}
      />
    );

    fireEvent.press(getByTestId('health-overview-card'));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('YourAppointments');

  });

  /**
   * AC-2
   * Verify appointment category filters are displayed.
   */
  it('should display Upcoming, Rescheduled and Completed appointment filters', () => {

    const { getByText } = render(
      <YourAppointments
        appointments={[]}
        loggedInUserId={101}
      />
    );

    expect(getByText('Upcoming')).toBeTruthy();
    expect(getByText('Rescheduled')).toBeTruthy();
    expect(getByText('Completed')).toBeTruthy();

  });

  /**
   * AC-3
   * Verify appointment counts are shown for each category.
   */
  it('should display the total number of appointments for each category', () => {

    const appointments = [
      {
        id: '1',
        patientId: 101,
        status: 'Upcoming',
      },
      {
        id: '2',
        patientId: 101,
        status: 'Upcoming',
      },
      {
        id: '3',
        patientId: 101,
        status: 'Rescheduled',
      },
      {
        id: '4',
        patientId: 101,
        status: 'Completed',
      }
    ];

    const { getByText } = render(
      <YourAppointments
        appointments={appointments}
        loggedInUserId={101}
      />
    );

    expect(getByText('2')).toBeTruthy(); // Upcoming
    expect(getByText('1')).toBeTruthy(); // Rescheduled
    expect(getByText('1')).toBeTruthy(); // Completed

  });

  /**
   * AC-4
   * Verify only logged-in user's appointments are displayed.
   */
  it('should display only appointments belonging to the logged-in user', () => {

    const appointments = [
      {
        id: '1',
        patientId: 101,
        name: 'GP Checkup',
        status: 'Upcoming',
      },
      {
        id: '2',
        patientId: 202,
        name: 'Eye Examination',
        status: 'Upcoming',
      }
    ];

    const { queryByText } = render(
      <YourAppointments
        appointments={appointments}
        loggedInUserId={101}
      />
    );

    expect(queryByText('GP Checkup')).toBeTruthy();
    expect(queryByText('Eye Examination')).toBeNull();

  });

  /**
   * AC-5
   * Verify an empty state message is displayed
   * when no appointments exist.
   */
  it('should display an empty state message when no appointments are available', () => {

    const { getByText } = render(
      <YourAppointments
        appointments={[]}
        loggedInUserId={101}
      />
    );

    expect(
      getByText("You don't have any appointments scheduled right now")
    ).toBeTruthy();

  });

});