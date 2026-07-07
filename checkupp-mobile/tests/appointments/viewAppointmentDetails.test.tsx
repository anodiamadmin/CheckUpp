import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import YourAppointments from '../YourAppointments';
import AppointmentDetails from '../AppointmentDetails';

describe('View Appointment Details', () => {

  /**
   * AC-1
   * Verify the user can open the Appointment Details screen
   * by selecting an appointment from the appointment list.
   */
  it('should navigate to the Appointment Details screen when an appointment is selected', () => {

    const navigate = jest.fn();

    const appointments = [
      {
        id: '1',
        patientId: 101,
        name: 'Cardiology Consultation',
        status: 'Upcoming',
      }
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
    expect(navigate).toHaveBeenCalledWith(
      'AppointmentDetails',
      {
        appointmentId: '1',
      }
    );

  });

  /**
   * AC-2
   * Verify the appointment date and time are displayed.
   */
  it('should display the appointment date and time', () => {

    const appointment = {
      appointmentDate: '25 Jun 2026',
      appointmentTime: '10:00 AM',
    };

    const { getByText } = render(
      <AppointmentDetails appointment={appointment} />
    );

    expect(getByText('25 Jun 2026')).toBeTruthy();
    expect(getByText('10:00 AM')).toBeTruthy();

  });

  /**
   * AC-3
   * Verify the medical facility name and address are displayed.
   */
  it('should display the medical facility name and facility address', () => {

    const appointment = {
      facilityName: 'City Health Clinic',
      facilityAddress: '123 Main Street, Springfield',
    };

    const { getByText } = render(
      <AppointmentDetails appointment={appointment} />
    );

    expect(getByText('City Health Clinic')).toBeTruthy();
    expect(getByText('123 Main Street, Springfield')).toBeTruthy();

  });

  /**
   * AC-4
   * Verify the doctor's/medical professional's name is displayed
   * when available.
   */
  it('should display the doctor name when available', () => {

    const appointment = {
      leadPhysician: 'Dr. John Smith',
    };

    const { getByText } = render(
      <AppointmentDetails appointment={appointment} />
    );

    expect(getByText('Dr. John Smith')).toBeTruthy();

  });

  /**
   * AC-5
   * Verify unavailable appointment details display "N/A"
   * while other available information remains visible.
   */
  it('should display "N/A" for unavailable appointment details', () => {

    const appointment = {
      appointmentDate: '25 Jun 2026',
      appointmentTime: '10:00 AM',
      facilityName: 'City Health Clinic',
      facilityAddress: '',
      leadPhysician: '',
    };

    const { getByText } = render(
      <AppointmentDetails appointment={appointment} />
    );

    expect(getByText('25 Jun 2026')).toBeTruthy();
    expect(getByText('10:00 AM')).toBeTruthy();
    expect(getByText('City Health Clinic')).toBeTruthy();

    expect(getByText('N/A')).toBeTruthy();

  });

  /**
   * AC-6
   * Verify tapping the back button returns
   * the user to the Your Appointments screen.
   */
  it('should navigate back to the Your Appointments screen when the back button is tapped', () => {

    const goBack = jest.fn();

    const { getByTestId } = render(
      <AppointmentDetails
        navigation={{ goBack }}
        appointment={{}}
      />
    );

    fireEvent.press(getByTestId('back-button'));

    expect(goBack).toHaveBeenCalledTimes(1);

  });

});