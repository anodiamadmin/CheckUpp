import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import YourAppointments from '../YourAppointments';

describe('View Completed Appointments', () => {

  /**
   * AC-1
   * Verify all Completed appointments are displayed
   * under the Completed tab.
   */
  it('should display all Completed appointments under the Completed tab', () => {

    const appointments = [
      {
        id: '1',
        patientId: 101,
        name: 'Annual Physical Examination',
        status: 'Completed',
        completedDate: '10 Jun 2026',
        completedTime: '09:30 AM',
      },
      {
        id: '2',
        patientId: 101,
        name: 'Blood Test',
        status: 'Completed',
        completedDate: '15 Jun 2026',
        completedTime: '11:00 AM',
      }
    ];

    const { getByText } = render(
      <YourAppointments
        appointments={appointments}
        loggedInUserId={101}
      />
    );

    fireEvent.press(getByText('Completed'));

    expect(getByText('Annual Physical Examination')).toBeTruthy();
    expect(getByText('Blood Test')).toBeTruthy();

  });

  /**
   * AC-2
   * Verify each Completed appointment displays
   * appointment name, completed date and completed time.
   */
  it('should display the appointment name, completed date and completed time for each Completed appointment', () => {

    const appointments = [
      {
        id: '1',
        patientId: 101,
        name: 'Annual Physical Examination',
        status: 'Completed',
        completedDate: '10 Jun 2026',
        completedTime: '09:30 AM',
      }
    ];

    const { getByText } = render(
      <YourAppointments
        appointments={appointments}
        loggedInUserId={101}
      />
    );

    fireEvent.press(getByText('Completed'));

    expect(getByText('Annual Physical Examination')).toBeTruthy();
    expect(getByText('10 Jun 2026')).toBeTruthy();
    expect(getByText('09:30 AM')).toBeTruthy();

  });

  /**
   * AC-3
   * Verify the user can tap a Completed appointment
   * to view its details.
   */
  it('should navigate to the appointment details screen when a Completed appointment is tapped', () => {

    const navigate = jest.fn();

    const appointments = [
      {
        id: '1',
        patientId: 101,
        name: 'Annual Physical Examination',
        status: 'Completed',
      }
    ];

    const { getByText } = render(
      <YourAppointments
        appointments={appointments}
        loggedInUserId={101}
        navigation={{ navigate }}
      />
    );

    fireEvent.press(getByText('Annual Physical Examination'));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(
      'AppointmentDetails',
      {
        appointmentId: '1',
      }
    );

  });

  /**
   * AC-4
   * Verify only Completed appointments associated
   * with the logged-in user are displayed.
   */
  it('should display only Completed appointments associated with the logged-in user', () => {

    const appointments = [
      {
        id: '1',
        patientId: 101,
        name: 'Annual Physical Examination',
        status: 'Completed',
      },
      {
        id: '2',
        patientId: 202,
        name: 'Dental Cleaning',
        status: 'Completed',
      }
    ];

    const { queryByText, getByText } = render(
      <YourAppointments
        appointments={appointments}
        loggedInUserId={101}
      />
    );

    fireEvent.press(getByText('Completed'));

    expect(queryByText('Annual Physical Examination')).toBeTruthy();
    expect(queryByText('Dental Cleaning')).toBeNull();

  });

  /**
   * AC-5
   * Verify an appropriate empty state message is displayed
   * when there are no Completed appointments.
   */
  it('should display "No completed appointments" when no Completed appointments exist', () => {

    const { getByText } = render(
      <YourAppointments
        appointments={[]}
        loggedInUserId={101}
      />
    );

    fireEvent.press(getByText('Completed'));

    expect(
      getByText('No completed appointments')
    ).toBeTruthy();

  });

});