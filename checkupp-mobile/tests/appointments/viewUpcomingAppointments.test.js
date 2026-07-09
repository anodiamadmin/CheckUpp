import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import YourAppointments from '../YourAppointments';

describe('View Upcoming Appointments', () => {

  /**
   * AC-1
   * Verify all Upcoming appointments are displayed
   * under the Upcoming tab.
   */
  it('should display all Upcoming appointments under the Upcoming tab', () => {

    const appointments = [
      {
        id: '1',
        patientId: 101,
        name: 'GP Checkup',
        status: 'Upcoming',
        date: '25 Jun 2026',
        time: '10:00 AM',
      },
      {
        id: '2',
        patientId: 101,
        name: 'Eye Exam',
        status: 'Upcoming',
        date: '02 Jul 2026',
        time: '02:30 PM',
      },
    ];

    const { getByText } = render(
      <YourAppointments
        appointments={appointments}
        loggedInUserId={101}
      />
    );

    fireEvent.press(getByText('Upcoming'));

    expect(getByText('GP Checkup')).toBeTruthy();
    expect(getByText('Eye Exam')).toBeTruthy();

  });

  /**
   * AC-2
   * Verify each Upcoming appointment displays
   * appointment name, scheduled date and scheduled time.
   */
  it('should display the appointment name, scheduled date and scheduled time for each Upcoming appointment', () => {

    const appointments = [
      {
        id: '1',
        patientId: 101,
        name: 'GP Checkup',
        status: 'Upcoming',
        date: '25 Jun 2026',
        time: '10:00 AM',
      },
    ];

    const { getByText } = render(
      <YourAppointments
        appointments={appointments}
        loggedInUserId={101}
      />
    );

    fireEvent.press(getByText('Upcoming'));

    expect(getByText('GP Checkup')).toBeTruthy();
    expect(getByText('25 Jun 2026')).toBeTruthy();
    expect(getByText('10:00 AM')).toBeTruthy();

  });

  /**
   * AC-3
   * Verify the user can tap an Upcoming appointment
   * to view its details.
   */
  it('should navigate to the Appointment Details screen when an Upcoming appointment is tapped', () => {

    const navigate = jest.fn();

    const appointments = [
      {
        id: '1',
        patientId: 101,
        name: 'GP Checkup',
        status: 'Upcoming',
      },
    ];

    const { getByText } = render(
      <YourAppointments
        appointments={appointments}
        loggedInUserId={101}
        navigation={{ navigate }}
      />
    );

    fireEvent.press(getByText('GP Checkup'));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('AppointmentDetails', {
      appointmentId: '1',
    });

  });

  /**
   * AC-4
   * Verify only Upcoming appointments associated
   * with the logged-in user are displayed.
   */
  it('should display only Upcoming appointments associated with the logged-in user', () => {

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
        name: 'Dental Checkup',
        status: 'Upcoming',
      },
    ];

    const { queryByText } = render(
      <YourAppointments
        appointments={appointments}
        loggedInUserId={101}
      />
    );

    fireEvent.press(getByText('Upcoming'));

    expect(queryByText('GP Checkup')).toBeTruthy();
    expect(queryByText('Dental Checkup')).toBeNull();

  });

  /**
   * AC-5
   * Verify an appropriate empty state message is displayed
   * when there are no Upcoming appointments.
   */
  it('should display "No upcoming appointments" when no Upcoming appointments exist', () => {

    const { getByText } = render(
      <YourAppointments
        appointments={[]}
        loggedInUserId={101}
      />
    );

    fireEvent.press(getByText('Upcoming'));

    expect(
      getByText('No upcoming appointments')
    ).toBeTruthy();

  });

});