import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthScreeningPage from '../../app/(tabs)/health-screening';

describe('Create Custom Health Check Appointment', () => {

  /**
   * AC-1
   * Verify the user can enter the appointment
   * date, time and location while creating
   * a custom health check.
   */
  it('should allow the user to enter appointment date, time and location', () => {

    const { getByTestId } = render(
      <HealthScreeningPage />
    );

    fireEvent.changeText(
      getByTestId('appointment-date-input'),
      '25 Jul 2026'
    );

    fireEvent.changeText(
      getByTestId('appointment-time-input'),
      '10:30 AM'
    );

    fireEvent.changeText(
      getByTestId('appointment-location-input'),
      'City Health Clinic'
    );

    expect(
      getByTestId('appointment-date-input').props.value
    ).toBe('25 Jul 2026');

    expect(
      getByTestId('appointment-time-input').props.value
    ).toBe('10:30 AM');

    expect(
      getByTestId('appointment-location-input').props.value
    ).toBe('City Health Clinic');

  });

  /**
   * AC-2
   * Verify the appointment details are linked
   * to the custom health check.
   */
  it('should associate the appointment details with the custom health check', async () => {

    const saveHealthCheck = jest.fn();

    const { getByTestId } = render(
      <HealthScreeningPage
        onSaveCustomHealthCheck={saveHealthCheck}
      />
    );

    fireEvent.changeText(
      getByTestId('appointment-date-input'),
      '25 Jul 2026'
    );

    fireEvent.changeText(
      getByTestId('appointment-time-input'),
      '10:30 AM'
    );

    fireEvent.changeText(
      getByTestId('appointment-location-input'),
      'City Health Clinic'
    );

    fireEvent.press(
      getByTestId('save-custom-health-check')
    );

    await waitFor(() => {
      expect(saveHealthCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          appointment: {
            date: '25 Jul 2026',
            time: '10:30 AM',
            location: 'City Health Clinic',
          },
        })
      );
    });

  });

  /**
   * AC-3
   * Verify appointment information is saved
   * successfully with the custom health check.
   */
  it('should save the appointment information successfully', async () => {

    const saveHealthCheck = jest.fn().mockResolvedValue(true);

    const { getByTestId } = render(
      <HealthScreeningPage
        onSaveCustomHealthCheck={saveHealthCheck}
      />
    );

    fireEvent.changeText(
      getByTestId('appointment-date-input'),
      '25 Jul 2026'
    );

    fireEvent.changeText(
      getByTestId('appointment-time-input'),
      '10:30 AM'
    );

    fireEvent.changeText(
      getByTestId('appointment-location-input'),
      'City Health Clinic'
    );

    fireEvent.press(
      getByTestId('save-custom-health-check')
    );

    await waitFor(() => {
      expect(saveHealthCheck).toHaveBeenCalledTimes(1);
    });

  });

});