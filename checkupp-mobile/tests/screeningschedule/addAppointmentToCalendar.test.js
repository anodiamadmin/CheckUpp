import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthScreeningPage from '../../app/(tabs)/health-screening';

describe('Add Appointment To Calendar', () => {

  /**
   * AC-1
   * Verify the Add to Calendar prompt is displayed
   * after saving a custom health check.
   */
  it('should display the Add to Calendar prompt after saving a health check', async () => {

    const { getByTestId, getByText } = render(
      <HealthScreeningPage />
    );

    fireEvent.press(
      getByTestId('save-health-check')
    );

    await waitFor(() => {
      expect(
        getByText('Add to Calendar')
      ).toBeTruthy();
    });

  });

  /**
   * AC-2
   * Verify the user can choose to add the appointment
   * to the calendar.
   */
  it('should allow the user to add the appointment to the calendar', async () => {

    const addToCalendar = jest.fn();

    const { getByTestId, getByText } = render(
      <HealthScreeningPage
        onAddToCalendar={addToCalendar}
      />
    );

    fireEvent.press(
      getByTestId('save-health-check')
    );

    fireEvent.press(
      getByText('Add')
    );

    await waitFor(() => {
      expect(addToCalendar).toHaveBeenCalledTimes(1);
    });

  });

  /**
   * AC-2
   * Verify the user can dismiss the Add to Calendar prompt.
   */
  it('should allow the user to dismiss the Add to Calendar prompt', async () => {

    const dismissPrompt = jest.fn();

    const { getByTestId, getByText } = render(
      <HealthScreeningPage
        onDismissCalendarPrompt={dismissPrompt}
      />
    );

    fireEvent.press(
      getByTestId('save-health-check')
    );

    fireEvent.press(
      getByText('Dismiss')
    );

    await waitFor(() => {
      expect(dismissPrompt).toHaveBeenCalledTimes(1);
    });

  });

  /**
   * AC-3
   * Verify appointment details are retained when
   * the user chooses Add.
   */
  it('should retain appointment details after adding to the calendar', async () => {

    const { getByTestId } = render(
      <HealthScreeningPage />
    );

    fireEvent.changeText(
      getByTestId('appointment-date-input'),
      '25 Jul 2026'
    );

    fireEvent.changeText(
      getByTestId('appointment-time-input'),
      '10:00 AM'
    );

    fireEvent.press(
      getByTestId('save-health-check')
    );

    fireEvent.press(
      getByTestId('calendar-add-button')
    );

    await waitFor(() => {

      expect(
        getByTestId('appointment-date-input').props.value
      ).toBe('25 Jul 2026');

      expect(
        getByTestId('appointment-time-input').props.value
      ).toBe('10:00 AM');

    });

  });

  /**
   * AC-3
   * Verify appointment details are retained when
   * the user dismisses the Add to Calendar prompt.
   */
  it('should retain appointment details after dismissing the calendar prompt', async () => {

    const { getByTestId } = render(
      <HealthScreeningPage />
    );

    fireEvent.changeText(
      getByTestId('appointment-date-input'),
      '25 Jul 2026'
    );

    fireEvent.changeText(
      getByTestId('appointment-time-input'),
      '10:00 AM'
    );

    fireEvent.press(
      getByTestId('save-health-check')
    );

    fireEvent.press(
      getByTestId('calendar-dismiss-button')
    );

    await waitFor(() => {

      expect(
        getByTestId('appointment-date-input').props.value
      ).toBe('25 Jul 2026');

      expect(
        getByTestId('appointment-time-input').props.value
      ).toBe('10:00 AM');

    });

  });

});