import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import YourAppointments from '../YourAppointments';

describe('View Rescheduled Appointments', () => {

  /**
   * AC-1
   * Verify all Rescheduled appointments are displayed
   * under the Rescheduled tab.
   */
  it('should display all Rescheduled appointments under the Rescheduled tab', () => {

    const appointments = [
      {
        id: '1',
        patientId: 101,
        name: 'Cardiology Consultation',
        status: 'Rescheduled',
        updatedDate: '15 Jul 2026',
        updatedTime: '11:30 AM',
      },
      {
        id: '2',
        patientId: 101,
        name: 'Dermatology Review',
        status: 'Rescheduled',
        updatedDate: '18 Jul 2026',
        updatedTime: '03:00 PM',
      },
    ];

    const { getByText } = render(
      <YourAppointments
        appointments={appointments}
        loggedInUserId={101}
      />
    );

    fireEvent.press(getByText('Rescheduled'));

    expect(getByText('Cardiology Consultation')).toBeTruthy();
    expect(getByText('Dermatology Review')).toBeTruthy();

  });

  /**
   * AC-2
   * Verify each Rescheduled appointment displays
   * appointment name, updated date and updated time.
   */
  it('should display the appointment name, updated date and updated time for each Rescheduled appointment', () => {

    const appointments = [
      {
        id: '1',
        patientId: 101,
        name: 'Cardiology Consultation',
        status: 'Rescheduled',
        updatedDate: '15 Jul 2026',
        updatedTime: '11:30 AM',
      },
    ];

    const { getByText } = render(
      <YourAppointments
        appointments={appointments}
        loggedInUserId={101}
      />
    );

    fireEvent.press(getByText('Rescheduled'));

    expect(getByText('Cardiology Consultation')).toBeTruthy();
    expect(getByText('15 Jul 2026')).toBeTruthy();
    expect(getByText('11:30 AM')).toBeTruthy();

  });

  /**
   * AC-3
   * Verify the user can tap a Rescheduled appointment
   * to view its details.
   */
  it('should navigate to the Appointment Details screen when a Rescheduled appointment is tapped', () => {

    const navigate = jest.fn();

    const appointments = [
      {
        id: '1',
        patientId: 101,
        name: 'Cardiology Consultation',
        status: 'Rescheduled',
      },
    ];

    const { getByText } = render(
      <YourAppointments
        appointments={appointments}
        loggedInUserId={101}
        navigation={{ navigate }}
      />
    );

    fireEvent.press(getByText('Cardiology Consultation'));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('AppointmentDetails', {
      appointmentId: '1',
    });

  });

  /**
   * AC-4
   * Verify only Rescheduled appointments associated
   * with the logged-in user are displayed.
   */
  it('should display only Rescheduled appointments associated with the logged-in user', () => {

    const appointments = [
      {
        id: '1',
        patientId: 101,
        name: 'Cardiology Consultation',
        status: 'Rescheduled',
      },
      {
        id: '2',
        patientId: 202,
        name: 'Dental Checkup',
        status: 'Rescheduled',
      },
    ];

    const { getByText, queryByText } = render(
      <YourAppointments
        appointments={appointments}
        loggedInUserId={101}
      />
    );

    fireEvent.press(getByText('Rescheduled'));

    expect(queryByText('Cardiology Consultation')).toBeTruthy();
    expect(queryByText('Dental Checkup')).toBeNull();

  });

  /**
   * AC-5
   * Verify an appropriate empty state message is displayed
   * when there are no Rescheduled appointments.
   */
  it('should display "No Rescheduled appointments" when no Rescheduled appointments exist', () => {

    const { getByText } = render(
      <YourAppointments
        appointments={[]}
        loggedInUserId={101}
      />
    );

    fireEvent.press(getByText('Rescheduled'));

    expect(
      getByText('No Rescheduled appointments')
    ).toBeTruthy();

  });

});