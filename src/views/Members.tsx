import { useState, useEffect, useMemo } from 'react';
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
import { useSettlement } from '../contexts/SettlementContext_simple';
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
  | 'total_xp'
  | 'highest_level'
  | 'total_level'
  | string; // string for dynamic skill columns
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: MemberSortField | SkillSortField | null;
  direction: SortDirection;
}

export function Members() {
  const { currentSettlement } = useSettlement();
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

  // Define skill names mapping
  const skillNames: { [key: number]: string } = useMemo(() => ({
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
  }), []);

  const refreshData = async () => {
    if (!currentSettlement) {
      setError('No settlement selected');
      return;
    }

    setRefreshing(true);
    
    try {
      // Fetch both members and skills data in parallel
      const [membersResponse, skillsResponse] = await Promise.all([
        fetch(`/api/bitjita-proxy?endpoint=claims/${currentSettlement.entityId}/members`),
        fetch(`/api/bitjita-proxy?endpoint=claims/${currentSettlement.entityId}/citizens`)
      ]);

      // Process members data
      if (!membersResponse.ok) {
        throw new Error(`Failed to fetch members: ${membersResponse.status} ${membersResponse.statusText}`);
      }
      
      const membersData = await membersResponse.json();
      
      // Transform the Bitjita API data to match our interface
      const transformedMembers: SettlementMember[] = membersData.members?.map((member: unknown, index: number) => {
        const memberData = member as Record<string, unknown>;
        return {
          id: (memberData.entityId || memberData.id || `member-${index}`) as string,
          player: (memberData.username || memberData.name || memberData.player || 'Unknown Player') as string,
          storage: Boolean((memberData.permissions as Record<string, unknown>)?.inventoryPermission === 1 || memberData.storage),
          build: Boolean((memberData.permissions as Record<string, unknown>)?.buildPermission === 1 || memberData.build),
          officer: Boolean((memberData.permissions as Record<string, unknown>)?.officerPermission === 1 || memberData.officer),
          co_owner: Boolean((memberData.permissions as Record<string, unknown>)?.coOwnerPermission === 1 || memberData.co_owner),
          is_online: Boolean(memberData.isOnline || memberData.is_online),
          role: (memberData.role || 'member') as string,
          last_seen: (memberData.lastLoginTimestamp || memberData.last_seen || null) as string | null,
          created_at: (memberData.createdAt || new Date().toISOString()) as string,
          updated_at: (memberData.updatedAt || new Date().toISOString()) as string,
        };
      }) || [];
      
      setMembers(transformedMembers);

      // Process skills data
      if (skillsResponse.ok) {
        const skillsData = await skillsResponse.json();
        
        const transformedSkills: SettlementSkill[] = [];
        
        skillsData.citizens?.forEach((citizen: unknown) => {
          const citizenData = citizen as Record<string, unknown>;
          const skills = citizenData.skills as Record<string, number> || {};
          const username = citizenData.userName as string;
          const entityId = citizenData.entityId as string;
          const totalXP = citizenData.totalXP as number || 0;
          const highestLevel = citizenData.highestLevel as number || 0;
          const totalLevel = citizenData.totalLevel as number || 0;
          const totalSkills = citizenData.totalSkills as number || 0;
          
          // Create individual skill records for each skill the citizen has
          Object.entries(skills).forEach(([skillIdStr, skillLevel]) => {
            const skillId = parseInt(skillIdStr, 10);
            transformedSkills.push({
              id: `${entityId}-${skillId}`,
              player_name: username,
              username: username,
              skill_name: skillNames[skillId] || `Skill ${skillId}`,
              skill_level: skillLevel,
              skill_xp: null, // Not provided by API
              player_id: entityId,
              skill_id: skillId,
              total_skills: totalSkills,
              highest_level: highestLevel,
              total_level: totalLevel,
              total_xp: totalXP,
            });
          });
        });
        
        setSkills(transformedSkills);
        console.log('Refreshed skills:', transformedSkills);
      } else {
        console.warn('Failed to fetch skills data, keeping skills empty');
        setSkills([]);
      }
      
      console.log('Refreshed members:', transformedMembers);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    }
    
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
      let aValue: string | number;
      let bValue: string | number;

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

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const result = aValue - bValue;
        return sortState.direction === 'asc' ? result : -result;
      }

      return 0;
    });
  };

  const sortSkillsData = (
    playerNames: string[],
    playerInfo: Record<string, { totalXp: number; highestLevel: number; totalLevel: number }>,
    playerSkills: Record<string, Record<number, number>>,
  ) => {
    if (!sortState.field) return playerNames;

    return [...playerNames].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortState.field) {
        case 'player':
          aValue = a;
          bValue = b;
          break;
        case 'total_xp':
          aValue = playerInfo[a]?.totalXp || 0;
          bValue = playerInfo[b]?.totalXp || 0;
          break;
        case 'highest_level':
          aValue = playerInfo[a]?.highestLevel || 0;
          bValue = playerInfo[b]?.highestLevel || 0;
          break;
        case 'total_level':
          aValue = playerInfo[a]?.totalLevel || 0;
          bValue = playerInfo[b]?.totalLevel || 0;
          break;
        default: {
          // Handle skill-specific columns (skill IDs as strings)
          const skillId = parseInt(sortState.field as string, 10);
          if (!isNaN(skillId)) {
            aValue = playerSkills[a]?.[skillId] || 0;
            bValue = playerSkills[b]?.[skillId] || 0;
          } else {
            return 0;
          }
          break;
        }
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortState.direction === 'asc' ? result : -result;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const result = aValue - bValue;
        return sortState.direction === 'asc' ? result : -result;
      }

      return 0;
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
    const fetchMembers = async () => {
      if (!currentSettlement) {
        setError('No settlement selected');
        return;
      }

      try {
        // Use the Bitjita API endpoint via backend proxy
        const membersUrl = `/api/bitjita-proxy?endpoint=claims/${currentSettlement.entityId}/members`;
        
        const response = await fetch(membersUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch members: ${response.status} ${response.statusText}`);
        }
        
        const membersData = await response.json();
        
        // Transform the Bitjita API data to match our interface
        const transformedMembers: SettlementMember[] = membersData.members?.map((member: unknown) => {
          const memberData = member as Record<string, unknown>;
          return {
            id: memberData.entityId,
            player: memberData.userName,
            storage: memberData.inventoryPermission === 1 ? true : false,
            build: memberData.buildPermission === 1 ? true : false,
            officer: memberData.officerPermission === 1 ? true : false,
            co_owner: memberData.coOwnerPermission === 1 ? true : false,
            is_online: Boolean(memberData.isOnline || memberData.is_online),
            role: (memberData.role || 'member') as string,
            last_seen: (memberData.lastLoginTimestamp) as string | null,
            created_at: (memberData.createdAt) as string,
            updated_at: (memberData.updatedAt) as string,
          };
        }) || [];
        
        setMembers(transformedMembers);
      } catch (err) {
        console.error('Error fetching members:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch members');
      }
    };

    const fetchSkills = async () => {
      if (!currentSettlement) {
        return;
      }

      try {
        // Use the Bitjita API endpoint for citizens/skills data via backend proxy
        const skillsUrl = `/api/bitjita-proxy?endpoint=claims/${currentSettlement.entityId}/citizens`;
        
        const response = await fetch(skillsUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch skills: ${response.status} ${response.statusText}`);
        }
        
        const skillsData = await response.json();
        
        // Transform the Bitjita API citizens data to match our SettlementSkill interface
        const transformedSkills: SettlementSkill[] = [];
        
        skillsData.citizens?.forEach((citizen: unknown) => {
          const citizenData = citizen as Record<string, unknown>;
          const skills = citizenData.skills as Record<string, number> || {};
          const username = citizenData.userName as string;
          const entityId = citizenData.entityId as string;
          const totalXP = citizenData.totalXP as number || 0;
          const highestLevel = citizenData.highestLevel as number || 0;
          const totalLevel = citizenData.totalLevel as number || 0;
          const totalSkills = citizenData.totalSkills as number || 0;
          
          // Create individual skill records for each skill the citizen has
          Object.entries(skills).forEach(([skillIdStr, skillLevel]) => {
            const skillId = parseInt(skillIdStr, 10);
            transformedSkills.push({
              id: `${entityId}-${skillId}`,
              player_name: username,
              username: username,
              skill_name: skillNames[skillId] || `Skill ${skillId}`,
              skill_level: skillLevel,
              skill_xp: null, // Not provided by API
              player_id: entityId,
              skill_id: skillId,
              total_skills: totalSkills,
              highest_level: highestLevel,
              total_level: totalLevel,
              total_xp: totalXP,
            });
          });
        });
        
        setSkills(transformedSkills);
      } catch (err) {
        console.error('Error fetching skills:', err);
        // Don't set error for skills since it's optional data
      }
    };

    const loadData = async () => {
      if (!currentSettlement) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      await Promise.all([fetchMembers(), fetchSkills()]);
      setLoading(false);
    };
    loadData();
  }, [currentSettlement, skillNames]);

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never';
    return new Date(lastSeen).toLocaleString();
  };

  const createSkillsMatrix = () => {
    // Group skills by player
    const playerSkills: { [username: string]: { [skillId: number]: number } } =
      {};
    const playerInfo: {
      [username: string]: {
        totalXp: number;
        highestLevel: number;
        totalLevel: number;
      };
    } = {};

    skills.forEach((skill) => {
      const username = skill.username;
      if (!playerSkills[username]) {
        playerSkills[username] = {};
        playerInfo[username] = {
          totalXp: skill.total_xp || 0,
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
                        <SortableHeader field="total_xp">
                          Total EXP
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
                              {(
                                playerInfo[username]?.totalXp || 0
                              ).toLocaleString()}
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
