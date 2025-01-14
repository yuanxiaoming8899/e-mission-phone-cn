import React from 'react';
import TripCard from '../cards/TripCard';
import PlaceCard from '../cards/PlaceCard';
import UntrackedTimeCard from '../cards/UntrackedTimeCard';
import { View, FlatList } from 'react-native';
import { ActivityIndicator, Banner, Text } from 'react-native-paper';
import LoadMoreButton from './LoadMoreButton';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';

const renderCard = ({ item: listEntry, index }) => {
  if (listEntry.origin_key.includes('trip')) {
    return <TripCard trip={listEntry} isFirstInList={index == 0} />;
  } else if (listEntry.origin_key.includes('place')) {
    return <PlaceCard place={listEntry} />;
  } else if (listEntry.origin_key.includes('untracked')) {
    return <UntrackedTimeCard triplike={listEntry} />;
  } else {
    throw new Error(`Unknown listEntry type: ${JSON.stringify(listEntry)}`);
  }
};

const separator = () => <View style={{ height: 8 }} />;
const bigSpinner = <ActivityIndicator size="large" style={{ margin: 15 }} />;
const smallSpinner = <ActivityIndicator size="small" style={{ margin: 5 }} />;

type Props = {
  listEntries: any[] | null;
  queriedRange: any;
  pipelineRange: any;
  loadMoreFn: (direction: string) => void;
  isLoading: boolean | string;
};
const TimelineScrollList = ({
  listEntries,
  queriedRange,
  pipelineRange,
  loadMoreFn,
  isLoading,
}: Props) => {
  const { t } = useTranslation();
  const listRef = React.useRef<FlatList | null>(null);

  // The way that FlashList inverts the scroll view means we have to reverse the order of items too
  const reversedListEntries = listEntries ? [...listEntries].reverse() : [];

  const reachedPipelineStart = queriedRange?.start_ts <= pipelineRange?.start_ts;
  const footer = (
    <LoadMoreButton onPressFn={() => loadMoreFn('past')} disabled={reachedPipelineStart}>
      {reachedPipelineStart ? t('diary.no-more-travel') : t('diary.show-older-travel')}
    </LoadMoreButton>
  );

  const reachedPipelineEnd = queriedRange?.end_ts >= pipelineRange?.end_ts;
  const header = (
    <LoadMoreButton onPressFn={() => loadMoreFn('future')} disabled={reachedPipelineEnd}>
      {reachedPipelineEnd ? t('diary.no-more-travel') : t('diary.show-more-travel')}
    </LoadMoreButton>
  );

  const noTravelBanner = (
    <Banner
      visible={true}
      icon={({ size }) => <Icon size={size} icon="alert-circle" style={{ marginVertical: 3 }} />}>
      <View style={{ width: '100%' }}>
        <Text variant="titleMedium">{t('diary.no-travel')}</Text>
        <Text variant="bodySmall">{t('diary.no-travel-hint')}</Text>
      </View>
    </Banner>
  );

  if (pipelineRange && !pipelineRange.end_ts && !listEntries?.length) {
    /* Condition: pipelineRange has been fetched but has no defined end, meaning nothing has been
      processed for this OPCode yet, and there are no unprocessed trips either. Show 'no travel'. */
    return noTravelBanner;
  } else if (isLoading == 'replace') {
    /* Condition: we're loading an entirely new batch of trips, so show a big spinner */
    return bigSpinner;
  } else if (listEntries && listEntries.length == 0) {
    /* Condition: we've loaded all travel and set `listEntries`, but it's empty. Show 'no travel'. */
    return noTravelBanner;
  } else if (listEntries) {
    /* Condition: we've successfully loaded and set `listEntries`, so show the list */
    return (
      <FlatList
        ref={listRef}
        nativeID="timelineScrollList"
        data={reversedListEntries}
        renderItem={renderCard}
        keyExtractor={(item) => item._id.$oid}
        /* TODO: We can capture onScroll events like this, so we should be able to automatically
            load more trips when the user is approaching the bottom or top of the list.
            This might be a nicer experience than the current header and footer buttons. */
        // onScroll={e => console.debug(e.nativeEvent.contentOffset.y)}
        ListHeaderComponent={
          isLoading == 'append' ? smallSpinner : !reachedPipelineEnd ? header : null
        }
        ListFooterComponent={isLoading == 'prepend' ? smallSpinner : footer}
        ItemSeparatorComponent={separator}
        /* use column-reverse so that the list is 'inverted', meaning it should start
            scrolling from the bottom, and the bottom-most item should be first in the DOM tree
          This method is used instead of the `inverted` property of FlatList, because `inverted`
            uses CSS transforms to flip the entire list and then flip each list item back, which
            is a performance hit and causes scrolling to be choppy, especially on old iPhones. */
        style={{ flexDirection: 'column-reverse' }}
        contentContainerStyle={{ flexDirection: 'column-reverse' }}
        /* Workaround for iOS Safari bug where a 'column-reverse' element containing scroll content
            shows up blank until it's scrolled or its layout changes.
          Adding a temporary 1px margin-right, and then removing it on the next event loop,
            is the least intrusive way I've found to trigger a layout change.
          It basically just jiggles the element so it doesn't blank out. */
        onContentSizeChange={() => {
          const list = document.getElementById('timelineScrollList');
          list?.style.setProperty('margin-right', '1px');
          setTimeout(() => {
            list?.style.setProperty('margin-right', '0');
          });
        }}
      />
    );
  } else {
    return <></>;
  }
};

export default TimelineScrollList;
