import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthScreeningPage from '../../app/(tabs)/health-screening';

describe('Manage Module Calendar Sync', () => {

  /**
   * AC-1
   * Verify the user can enable or disable
   * calendar sync for individual health modules.
   */
  it('should allow the user to enable or disable sync for individual health modules', async () => {

    const updateModuleSync = jest.fn();

    const { getByTestId } = render(
      <HealthScreeningPage
        onUpdateModuleSync={updateModuleSync}
      />
    );

    fireEvent(
      getByTestId('screenings-sync-switch'),
      'valueChange',
      true
    );

    fireEvent(
      getByTestId('pregnancy-sync-switch'),
      'valueChange',
      false
    );

    await waitFor(() => {

      expect(updateModuleSync).toHaveBeenCalledWith(
        'Screenings',
        true
      );

      expect(updateModuleSync).toHaveBeenCalledWith(
        'Pregnancy',
        false
      );

    });

  });

  /**
   * AC-2
   * Verify all supported health modules
   * are displayed in Calendar & Sync Settings.
   */
  it('should display all supported health modules', () => {

    const { getByText } = render(
      <HealthScreeningPage />
    );

    expect(getByText('Screenings')).toBeTruthy();
    expect(getByText('Pregnancy')).toBeTruthy();
    expect(getByText('Midlife Health')).toBeTruthy();
    expect(getByText('Menopause')).toBeTruthy();
    expect(getByText('Other Ailments')).toBeTruthy();

  });

  /**
   * AC-3
   * Verify only appointments from enabled
   * modules are synchronised to the calendar.
   */
  it('should sync appointments only for enabled health modules', async () => {

    const syncAppointments = jest.fn();

    const enabledModules = [
      'Screenings',
      'Other Ailments',
    ];

    const { getByTestId } = render(
      <HealthScreeningPage
        enabledModules={enabledModules}
        onSyncAppointments={syncAppointments}
      />
    );

    fireEvent.press(
      getByTestId('sync-calendar-button')
    );

    await waitFor(() => {

      expect(syncAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          modules: [
            'Screenings',
            'Other Ailments',
          ],
        })
      );

    });

  });

});