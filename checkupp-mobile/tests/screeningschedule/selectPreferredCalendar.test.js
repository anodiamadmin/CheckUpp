import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthScreeningPage from '../../app/(tabs)/health-screening';

describe('Select Preferred Calendar', () => {

  /**
   * AC-1
   * Verify the user can choose a supported
   * calendar application.
   */
  it('should allow the user to select Google Calendar, Apple Calendar or Outlook', async () => {

    const onCalendarSelected = jest.fn();

    const { getByText } = render(
      <HealthScreeningPage
        onCalendarSelected={onCalendarSelected}
      />
    );

    fireEvent.press(getByText('Google Calendar'));

    await waitFor(() => {
      expect(onCalendarSelected).toHaveBeenCalledWith(
        'Google Calendar'
      );
    });

  });

  /**
   * AC-1
   * Verify Apple Calendar can be selected.
   */
  it('should allow the user to select Apple Calendar', async () => {

    const onCalendarSelected = jest.fn();

    const { getByText } = render(
      <HealthScreeningPage
        onCalendarSelected={onCalendarSelected}
      />
    );

    fireEvent.press(getByText('Apple Calendar'));

    await waitFor(() => {
      expect(onCalendarSelected).toHaveBeenCalledWith(
        'Apple Calendar'
      );
    });

  });

  /**
   * AC-1
   * Verify Outlook Calendar can be selected.
   */
  it('should allow the user to select Outlook Calendar', async () => {

    const onCalendarSelected = jest.fn();

    const { getByText } = render(
      <HealthScreeningPage
        onCalendarSelected={onCalendarSelected}
      />
    );

    fireEvent.press(getByText('Outlook'));

    await waitFor(() => {
      expect(onCalendarSelected).toHaveBeenCalledWith(
        'Outlook'
      );
    });

  });

  /**
   * AC-2
   * Verify the selected calendar is remembered
   * for future synchronisations.
   */
  it('should remember the selected calendar for future syncs', async () => {

    const savePreferredCalendar = jest.fn();

    const { getByText } = render(
      <HealthScreeningPage
        savePreferredCalendar={savePreferredCalendar}
      />
    );

    fireEvent.press(getByText('Google Calendar'));

    await waitFor(() => {
      expect(savePreferredCalendar).toHaveBeenCalledWith(
        'Google Calendar'
      );
    });

  });

  /**
   * AC-3
   * Verify the user can change the preferred calendar.
   */
  it('should allow the user to change the preferred calendar', async () => {

    const updatePreferredCalendar = jest.fn();

    const { getByText } = render(
      <HealthScreeningPage
        updatePreferredCalendar={updatePreferredCalendar}
      />
    );

    fireEvent.press(getByText('Google Calendar'));

    fireEvent.press(getByText('Outlook'));

    await waitFor(() => {
      expect(updatePreferredCalendar).toHaveBeenCalledWith(
        'Outlook'
      );
    });

  });

});