import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Table,
  Switch,
  Stack,
  Text,
  Badge,
  Group,
  Button,
  Alert,
  Loader,
  Center,
  UnstyledButton,
  ScrollArea,
} from '@mantine/core';
import {
  IconUsers,
  IconArrowLeft,
  IconRefresh,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { supabaseClient } from '../supabase/supabaseClient';
import { PermissionGate } from '../components/PermissionGate';

interface SettlementMember {
  id: string;
  player: string;
  storage: boolean;
  build: boolean;
  officer: boolean;
  co_owner: boolean;
  is_online: boolean;
  role: string;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

interface SettlementSkill {
  id: string;
  player_name: string | null;
  username: string;
  skill_name: string;
  skill_level: number | null;
  skill_xp: number | null;
  player_id: string;
  skill_id: number;
  total_skills: number;
  highest_level: number;
  total_level: number;
  total_xp: number;
}

type MemberSortField =
  | 'player'
  | 'last_seen'
  | 'storage'
  | 'build'
  | 'officer'
  | 'co_owner';
type SkillSortField =
  | 'player'
  | 'total_skills'
  | 'highest_level'
  | 'total_level'
  | string; // string for dynamic skill columns
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: MemberSortField | SkillSortField | null;
  direction: SortDirection;
}

export function Members() {
  const [members, setMembers] = useState<SettlementMember[]>([]);
  const [skills, setSkills] = useState<SettlementSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSkills, setShowSkills] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortState, setSortState] = useState<SortState>({
    field: null,
    direction: 'asc',
  });

  const fetchMembers = async () => {
    try {
      const { data: membersData, error: membersError } = await supabaseClient
        .from('settlement_members')
        .select('*')
        .order('player', { ascending: true });

      if (membersError) throw membersError;
      setMembers(membersData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    }
  };

  const fetchSkills = async () => {
    try {
      const { data: skillsData, error: skillsError } = await supabaseClient
        .from('settlement_skills')
        .select('*')
        .order('username', { ascending: true });

      if (skillsError) throw skillsError;
      setSkills(skillsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch skills');
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchMembers(), fetchSkills()]);
    setRefreshing(false);
  };

  const handleSort = (field: MemberSortField | SkillSortField) => {
    setSortState((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (field: MemberSortField | SkillSortField) => {
    if (sortState.field !== field) {
      return <IconSelector size={14} />;
    }
    return sortState.direction === 'asc' ? (
      <IconChevronUp size={14} />
    ) : (
      <IconChevronDown size={14} />
    );
  };

  const sortMembers = (members: SettlementMember[]): SettlementMember[] => {
    if (!sortState.field) return members;

    return [...members].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortState.field) {
        case 'player':
          aValue = a.player;
          bValue = b.player;
          break;
        case 'last_seen':
          aValue = a.last_seen ? new Date(a.last_seen).getTime() : 0;
          bValue = b.last_seen ? new Date(b.last_seen).getTime() : 0;
          break;
        case 'storage':
          aValue = a.storage ? 1 : 0;
          bValue = b.storage ? 1 : 0;
          break;
        case 'build':
          aValue = a.build ? 1 : 0;
          bValue = b.build ? 1 : 0;
          break;
        case 'officer':
          aValue = a.officer ? 1 : 0;
          bValue = b.officer ? 1 : 0;
          break;
        case 'co_owner':
          aValue = a.co_owner ? 1 : 0;
          bValue = b.co_owner ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortState.direction === 'asc' ? result : -result;
      }

      const result = aValue - bValue;
      return sortState.direction === 'asc' ? result : -result;
    });
  };

  const sortSkillsData = (
    playerNames: string[],
    playerInfo: any,
    playerSkills: any,
  ) => {
    if (!sortState.field) return playerNames;

    return [...playerNames].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortState.field) {
        case 'player':
          aValue = a;
          bValue = b;
          break;
        case 'total_skills':
          aValue = playerInfo[a]?.totalSkills || 0;
          bValue = playerInfo[b]?.totalSkills || 0;
          break;
        case 'highest_level':
          aValue = playerInfo[a]?.highestLevel || 0;
          bValue = playerInfo[b]?.highestLevel || 0;
          break;
        case 'total_level':
          aValue = playerInfo[a]?.totalLevel || 0;
          bValue = playerInfo[b]?.totalLevel || 0;
          break;
        default:
          // Handle dynamic skill columns (skill IDs)
          if (
            typeof sortState.field === 'string' &&
            /^\d+$/.test(sortState.field)
          ) {
            const skillId = sortState.field;
            aValue = playerSkills[a]?.[skillId] || 0;
            bValue = playerSkills[b]?.[skillId] || 0;
          } else {
            return 0;
          }
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortState.direction === 'asc' ? result : -result;
      }

      const result = aValue - bValue;
      return sortState.direction === 'asc' ? result : -result;
    });
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: MemberSortField | SkillSortField;
    children: React.ReactNode;
  }) => (
    <Table.Th>
      <UnstyledButton
        onClick={() => handleSort(field)}
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <Text fw={600}>{children}</Text>
        {getSortIcon(field)}
      </UnstyledButton>
    </Table.Th>
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMembers(), fetchSkills()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never';
    return new Date(lastSeen).toLocaleString();
  };

  // Define skill names mapping
  const skillNames: { [key: number]: string } = {
    2: 'Forestry',
    3: 'Carpentry',
    4: 'Masonry',
    5: 'Mining',
    6: 'Smithing',
    7: 'Scholar',
    8: 'Leatherworking',
    9: 'Hunting',
    10: 'Tailoring',
    11: 'Farming',
    12: 'Fishing',
    13: 'Cooking',
    14: 'Foraging',
    15: 'Construction',
    17: 'Taming',
    18: 'Slayer',
    19: 'Merchanting',
    21: 'Sailing',
  };

  const createSkillsMatrix = () => {
    // Group skills by player
    const playerSkills: { [username: string]: { [skillId: number]: number } } =
      {};
    const playerInfo: {
      [username: string]: {
        totalSkills: number;
        highestLevel: number;
        totalLevel: number;
      };
    } = {};

    skills.forEach((skill) => {
      const username = skill.username;
      if (!playerSkills[username]) {
        playerSkills[username] = {};
        playerInfo[username] = {
          totalSkills: skill.total_skills || 0,
          highestLevel: skill.highest_level || 0,
          totalLevel: skill.total_level || 0,
        };
      }
      if (skill.skill_id && skill.skill_level) {
        playerSkills[username][skill.skill_id] = skill.skill_level;
      }
    });

    return { playerSkills, playerInfo };
  };

  const getBadgeColor = (value: boolean) => {
    return value ? 'green' : 'gray';
  };

  const getSkillLevelColor = (level: number) => {
    if (level >= 60) return 'violet';
    if (level >= 40) return 'blue';
    if (level >= 20) return 'green';
    return 'gray';
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <PermissionGate permission="users.read">
      <Container size="xl" py="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Group>
              <Button
                component={Link}
                to="/"
                leftSection={<IconArrowLeft size={16} />}
                variant="subtle"
              >
                Back to Dashboard
              </Button>
              <Title order={2}>
                <IconUsers size={28} style={{ marginRight: 8 }} />
                Settlement Members
              </Title>
            </Group>
            <Button
              leftSection={<IconRefresh size={16} />}
              loading={refreshing}
              onClick={refreshData}
              variant="light"
            >
              Refresh Data
            </Button>
          </Group>

          {error && (
            <Alert color="red" title="Error">
              {error}
            </Alert>
          )}

          <Group>
            <Switch
              label="Show Skills Data"
              checked={showSkills}
              onChange={(event) => setShowSkills(event.currentTarget.checked)}
            />
            <Text size="sm" c="dimmed">
              {showSkills
                ? 'Showing player skills'
                : 'Showing member permissions'}
            </Text>
          </Group>
        </Stack>
      </Container>

      {/* Separate full-width container for the table */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <ScrollArea>
          <div style={{ width: 'fit-content', padding: '0 1rem' }}>
            {!showSkills ? (
              // Members permissions view
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <SortableHeader field="player">Player</SortableHeader>
                    <SortableHeader field="storage">Storage</SortableHeader>
                    <SortableHeader field="build">Build</SortableHeader>
                    <SortableHeader field="officer">Officer</SortableHeader>
                    <SortableHeader field="co_owner">Co-Owner</SortableHeader>
                    <SortableHeader field="last_seen">Last Seen</SortableHeader>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sortMembers(members).map((member) => (
                    <Table.Tr key={member.id}>
                      <Table.Td>
                        <Text fw={500}>{member.player}</Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Badge color={getBadgeColor(member.storage)} size="sm">
                          {member.storage ? 'Yes' : 'No'}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Badge color={getBadgeColor(member.build)} size="sm">
                          {member.build ? 'Yes' : 'No'}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Badge color={getBadgeColor(member.officer)} size="sm">
                          {member.officer ? 'Yes' : 'No'}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Badge color={getBadgeColor(member.co_owner)} size="sm">
                          {member.co_owner ? 'Yes' : 'No'}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Text size="sm">
                          {formatLastSeen(member.last_seen)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              // Skills matrix view
              (() => {
                const { playerSkills, playerInfo } = createSkillsMatrix();
                const playerNames = sortSkillsData(
                  Object.keys(playerSkills),
                  playerInfo,
                  playerSkills,
                );
                const skillIds = Object.keys(skillNames)
                  .map(Number)
                  .sort((a, b) => a - b);

                return (
                  <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <SortableHeader field="player">Player</SortableHeader>
                        <SortableHeader field="total_skills">
                          Total Skills
                        </SortableHeader>
                        <SortableHeader field="highest_level">
                          Highest Level
                        </SortableHeader>
                        <SortableHeader field="total_level">
                          Total Level
                        </SortableHeader>
                        {skillIds.map((skillId) => (
                          <SortableHeader
                            key={skillId}
                            field={skillId.toString()}
                          >
                            {skillNames[skillId]}
                          </SortableHeader>
                        ))}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {playerNames.map((username) => (
                        <Table.Tr key={username}>
                          <Table.Td>
                            <Text fw={500}>{username}</Text>
                          </Table.Td>
                          <Table.Td ta="center">
                            <Text>
                              {playerInfo[username]?.totalSkills || 0}
                            </Text>
                          </Table.Td>
                          <Table.Td ta="center">
                            <Badge color="violet" size="sm">
                              {playerInfo[username]?.highestLevel || 0}
                            </Badge>
                          </Table.Td>
                          <Table.Td ta="center">
                            <Text>{playerInfo[username]?.totalLevel || 0}</Text>
                          </Table.Td>
                          {skillIds.map((skillId) => {
                            const level = playerSkills[username]?.[skillId];
                            return (
                              <Table.Td key={skillId} ta="center">
                                {level ? (
                                  <Badge
                                    color={getSkillLevelColor(level)}
                                    size="sm"
                                  >
                                    {level}
                                  </Badge>
                                ) : (
                                  <Text c="dimmed" size="sm">
                                    -
                                  </Text>
                                )}
                              </Table.Td>
                            );
                          })}
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                );
              })()
            )}
          </div>
        </ScrollArea>
      </div>

      <Container size="xl" py="md">
        {((!showSkills && members.length === 0) ||
          (showSkills && skills.length === 0)) && (
          <Center h={200}>
            <Stack align="center">
              <Text size="lg" c="dimmed">
                No {showSkills ? 'skills' : 'members'} data available
              </Text>
              <Text size="sm" c="dimmed">
                Data will be automatically updated from the settlement
              </Text>
            </Stack>
          </Center>
        )}
      </Container>
    </PermissionGate>
  );
}
